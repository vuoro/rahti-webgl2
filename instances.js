import { effect, isServer, onCleanup } from "@vuoro/rahti";
import { requestPreRenderJob } from "./animation-frame.js";
import { buffer } from "./buffer.js";

export const instances = effect((context, attributeMap) => {
  if (isServer) return;
  const { requestRendering } = context;

  const attributes = new Map();

  for (const key in attributeMap) {
    const value = attributeMap[key];

    const bufferObject = buffer(context, [value], undefined, "DYNAMIC_DRAW");
    const { Constructor } = bufferObject;

    attributes.set(key, {
      bufferObject,
      defaultValue: value.length ? new Constructor(value) : new Constructor.of(value),
    });
  }

  const instances = new Set();
  const instanceOffsets = new Map();

  onCleanup(() => {
    attributes.clear();
    instances.clear();
    instanceOffsets.clear();
  });

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

    for (const { key, defaultValue } of attributes) {
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

  const instanceUpdater = effect((instance, key, value) => {
    instance.set(key, value);
    attributes.get(key).update(value, instanceOffsets.get(instance));
    requestRendering();
  });

  const instanceEffect = effect((instanceAttributes) => {
    const instance = instanceCreator(attributes, requestRendering, buildInstances);

    for (const key in instanceAttributes) {
      instanceUpdater(instance, key, instanceAttributes[key]);
    }
  });

  instanceEffect.attributes = attributes;
  instanceEffect.instances = instances;

  return instanceEffect;
});
