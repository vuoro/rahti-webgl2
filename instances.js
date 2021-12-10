import { effect, isServer, onCleanup } from "@vuoro/rahti";
import { requestPreRenderJob } from "./animation-frame.js";
import { buffer } from "./buffer.js";

export const instances = effect((context, attributeMap) => {
  if (isServer) return {};
  const { requestRendering } = context;

  const attributes = new Map();

  for (const key in attributeMap) {
    const value = attributeMap[key];

    const bufferObject = buffer(context, [value], undefined, "DYNAMIC_DRAW");
    const { Constructor } = bufferObject;

    bufferObject.defaultValue = value.length ? new Constructor(value) : new Constructor.of(value);

    attributes.set(key, bufferObject);
  }

  const instances = new Set();
  const instanceOffsets = new Map();

  const buildInstances = () => {
    instanceOffsets.clear();
    let isFirstAttribute = true;

    for (const [key, { set, Constructor, dimensions }] of attributes) {
      const batch = new Constructor(dimensions * instances.size);

      for (const instance of instances) {
        if (isFirstAttribute) {
          instanceOffsets.set(instance, instanceOffsets.size);
        }

        const value = instance.get(key);

        if (dimensions === 1) {
          batch[instanceOffsets.get(instance) * dimensions] = value;
        } else {
          batch.set(value, instanceOffsets.get(instance) * dimensions);
        }
      }

      set(batch);
      isFirstAttribute = false;
    }
  };

  const instanceCreator = effect(() => {
    const instance = new Map();

    for (const [key, { defaultValue }] of attributes) {
      instance.set(
        key,
        Array.isArray(defaultValue)
          ? [...defaultValue]
          : ArrayBuffer.isView(defaultValue)
          ? new defaultValue.constructor(defaultValue)
          : defaultValue
      );
    }

    instances.add(instance);
    requestPreRenderJob(buildInstances);
    requestRendering();

    onCleanup(() => {
      instances.delete(instance);
      requestPreRenderJob(buildInstances);
      requestRendering();
    });

    return instance;
  });

  const instanceAttribute = effect(
    (key, value, instance) => {
      instance.set(key, value);
      const { dimensions, defaultValue, update } = attributes.get(key);
      const offset = instanceOffsets.get(instance);

      if (offset !== undefined) {
        update(value, offset * dimensions);
        requestRendering();

        onCleanup((isFinal) => {
          if (isFinal) {
            instance.set(key, defaultValue);
            update(defaultValue, offset * dimensions);
            requestRendering();
          }
        });
      }
    },
    (a, b) => {
      if (typeof a !== typeof b) return false;

      if (typeof a === "object") {
        // Shallow-compare attributes
        for (const key in a) {
          if (!(key in b) || a[key] !== b[key]) {
            return false;
          }
        }
        for (const key in b) {
          if (!(key in a) || a[key] !== b[key]) {
            return false;
          }
        }
        return true;
      }

      return a === b;
    }
  );

  const instanceEffect = effect((key, newAttributes) => {
    const instance = instanceCreator();
    if (newAttributes) {
      for (const [key] of attributes) {
        if (key in newAttributes) instanceAttribute(key, newAttributes[key], instance);
      }
    }
  });

  onCleanup(() => {
    attributes.clear();
    instances.clear();
    instanceOffsets.clear();
  });

  instanceEffect.attributes = attributes;
  instanceEffect.instances = instances;

  return instanceEffect;
});
