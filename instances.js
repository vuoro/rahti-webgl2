import { cleanup } from "@vuoro/rahti";
import { requestPreRenderJob } from "./animation-frame.js";
import { buffer } from "./buffer.js";

export const instances = function (context, attributeMap) {
  const attributes = new Map();

  for (const key in attributeMap) {
    const value = attributeMap[key];

    const data = [value];
    const bufferObject = this(buffer)(context, data, undefined, "DYNAMIC_DRAW");
    const { Constructor } = bufferObject;

    bufferObject.defaultValue = value.length ? new Constructor(value) : new Constructor(data);

    attributes.set(key, bufferObject);
  }

  const additions = new Set();
  const deletions = new Set();
  const instances = new Map();
  const slots = new Map();
  const freeSlots = [];
  const changes = new Map();
  const orphans = new Set();

  const buildInstances = () => {
    const oldSize = instances.size;
    const newSize = oldSize + additions.size - deletions.size;

    // Mark deletions as free slots
    for (const instance of deletions) {
      const slot = instances.get(instance);
      instances.delete(instance);
      slots.delete(slot);

      if (slot < newSize) {
        freeSlots.push(slot);
      }
    }

    // Mark orphans
    for (let slot = newSize; slot < oldSize; slot++) {
      const instance = slots.get(slot);

      if (instance) {
        instances.delete(instance);
        slots.delete(slot);
        orphans.add(instance);
      }
    }

    // Add new instances
    for (const instance of additions) {
      const slot = freeSlots.length ? freeSlots.pop() : instances.size;
      instances.set(instance, slot);
      slots.set(slot, instance);
      changes.set(instance, slot);
    }

    // Move orphans into remaining slots
    for (const instance of orphans) {
      const slot = freeSlots.pop();
      instances.set(instance, slot);
      slots.set(slot, instance);
      changes.set(instance, slot);
    }

    // Create new typedarrays
    for (const [key, { allData, Constructor, dimensions, set }] of attributes) {
      let newData;

      if (newSize <= oldSize) {
        // slice old array
        newData = allData.subarray(0, newSize * dimensions);
      } else {
        // create new array
        newData = new Constructor(newSize * dimensions);
        newData.set(allData);
      }

      // And fill in the changes
      for (const [instance, slot] of changes) {
        const value = instance.get(key);

        if (dimensions === 1) {
          newData[slot] = value;
        } else {
          newData.set(value, slot * dimensions);
        }
      }

      set(newData);
    }

    deletions.clear();
    additions.clear();
    orphans.clear();
    changes.clear();
  };

  const instanceEffect = function (newAttributes) {
    const instance = this(instanceCreator)();

    if (newAttributes) {
      for (const key in newAttributes) {
        const value = newAttributes[key];
        instance.set(key, value);

        const slot = instances.get(instance);
        if (slot !== undefined) {
          const { dimensions, update } = attributes.get(key);
          update(value, slot * dimensions);
        }

        this(instanceAttributeResetter, key)(key, instance);
      }
    }
  };

  const instanceCreator = function () {
    const instance = new Map();

    for (const [key, { defaultValue }] of attributes) {
      instance.set(key, defaultValue);
    }

    additions.add(instance);
    requestPreRenderJob(buildInstances);

    cleanup(this).then(() => {
      if (additions.has(instance)) {
        additions.delete(instance);
      } else {
        deletions.add(instance);
      }

      requestPreRenderJob(buildInstances);
    });

    return instance;
  };

  const instanceAttributeResetter = function (key, instance) {
    cleanup(this).then((isFinal) => {
      if (isFinal) {
        const { dimensions, defaultValue, update } = attributes.get(key);
        instance.set(key, defaultValue);
        const slot = instances.get(instance);

        if (slot !== undefined && !deletions.has(instance)) {
          update(defaultValue, slot * dimensions);
        }
      }
    });
  };

  cleanup(this).then(() => {
    attributes.clear();
    additions.clear();
    deletions.clear();
  });

  instanceEffect.attributes = attributes;
  instanceEffect.instances = instances;

  return instanceEffect;
};
