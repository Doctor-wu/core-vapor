import { EffectScope, TrackOpTypes, track } from '@vue/reactivity'
import { EMPTY_OBJ, NOOP, isFunction } from '@vue/shared'
import type { Block } from './apiRender'
import type { DirectiveBinding } from './directives'
import {
  type ComponentPropsOptions,
  type NormalizedPropsOptions,
  type NormalizedRawProps,
  type RawProps,
  initProps,
  normalizePropsOptions,
} from './componentProps'
import {
  type EmitFn,
  type EmitsOptions,
  type ObjectEmitsOptions,
  emit,
  normalizeEmitsOptions,
} from './componentEmits'
import { VaporLifecycleHooks } from './apiLifecycle'

import type { Data } from '@vue/shared'
import { warn } from './warning'

export type Component = FunctionalComponent | ObjectComponent

export type SetupFn = (props: any, ctx?: SetupContext) => Block | Data | void
export type FunctionalComponent = SetupFn & Omit<ObjectComponent, 'setup'>

export type SetupContext<E = EmitsOptions> = E extends any
  ? {
      attrs: Data
      emit: EmitFn<E>
      expose: (exposed?: Record<string, any>) => void
      // TODO slots
    }
  : never

export function createSetupContext(
  instance: ComponentInternalInstance,
): SetupContext {
  if (__DEV__) {
    // We use getters in dev in case libs like test-utils overwrite instance
    // properties (overwrites should not be done in prod)
    return Object.freeze({
      get attrs() {
        return getAttrsProxy(instance)
      },
      get emit() {
        return (event: string, ...args: any[]) => instance.emit(event, ...args)
      },
      expose: NOOP,
    })
  } else {
    return {
      get attrs() {
        return getAttrsProxy(instance)
      },
      emit: instance.emit,
      expose: NOOP,
    }
  }
}

export interface ObjectComponent {
  props?: ComponentPropsOptions
  inheritAttrs?: boolean
  emits?: EmitsOptions
  setup?: SetupFn
  render?(ctx: any): Block
  vapor?: boolean
}

type LifecycleHook<TFn = Function> = TFn[] | null

export const componentKey = Symbol(__DEV__ ? `componentKey` : ``)

export interface ComponentInternalInstance {
  [componentKey]: true
  uid: number
  vapor: true

  block: Block | null
  container: ParentNode
  parent: ComponentInternalInstance | null

  scope: EffectScope
  component: FunctionalComponent | ObjectComponent
  comps: Set<ComponentInternalInstance>
  dirs: Map<Node, DirectiveBinding[]>

  rawProps: NormalizedRawProps
  propsOptions: NormalizedPropsOptions
  emitsOptions: ObjectEmitsOptions | null

  // state
  setupState: Data
  setupContext: SetupContext | null
  props: Data
  emit: EmitFn
  emitted: Record<string, boolean> | null
  attrs: Data
  refs: Data

  attrsProxy: Data | null

  // lifecycle
  isMounted: boolean
  isUnmounted: boolean
  isUpdating: boolean
  // TODO: registory of provides, lifecycles, ...
  /**
   * @internal
   */
  [VaporLifecycleHooks.BEFORE_MOUNT]: LifecycleHook
  /**
   * @internal
   */
  [VaporLifecycleHooks.MOUNTED]: LifecycleHook
  /**
   * @internal
   */
  [VaporLifecycleHooks.BEFORE_UPDATE]: LifecycleHook
  /**
   * @internal
   */
  [VaporLifecycleHooks.UPDATED]: LifecycleHook
  /**
   * @internal
   */
  [VaporLifecycleHooks.BEFORE_UNMOUNT]: LifecycleHook
  /**
   * @internal
   */
  [VaporLifecycleHooks.UNMOUNTED]: LifecycleHook
  /**
   * @internal
   */
  [VaporLifecycleHooks.RENDER_TRACKED]: LifecycleHook
  /**
   * @internal
   */
  [VaporLifecycleHooks.RENDER_TRIGGERED]: LifecycleHook
  /**
   * @internal
   */
  [VaporLifecycleHooks.ACTIVATED]: LifecycleHook
  /**
   * @internal
   */
  [VaporLifecycleHooks.DEACTIVATED]: LifecycleHook
  /**
   * @internal
   */
  [VaporLifecycleHooks.ERROR_CAPTURED]: LifecycleHook
  /**
   * @internal
   */
  // [VaporLifecycleHooks.SERVER_PREFETCH]: LifecycleHook<() => Promise<unknown>>
}

// TODO
export let currentInstance: ComponentInternalInstance | null = null

export const getCurrentInstance: () => ComponentInternalInstance | null = () =>
  currentInstance

export const setCurrentInstance = (instance: ComponentInternalInstance) => {
  const prev = currentInstance
  currentInstance = instance
  instance.scope.on()
  return () => {
    instance.scope.off()
    currentInstance = prev
  }
}

export const unsetCurrentInstance = () => {
  currentInstance?.scope.off()
  currentInstance = null
}

let uid = 0
export function createComponentInstance(
  component: ObjectComponent | FunctionalComponent,
  rawProps: RawProps | null,
): ComponentInternalInstance {
  const instance: ComponentInternalInstance = {
    [componentKey]: true,
    uid: uid++,
    vapor: true,

    block: null,
    container: null!,

    // TODO
    parent: null,

    scope: new EffectScope(true /* detached */)!,
    component,
    comps: new Set(),
    dirs: new Map(),

    // resolved props and emits options
    rawProps: null!, // set later
    propsOptions: normalizePropsOptions(component),
    emitsOptions: normalizeEmitsOptions(component),

    // state
    setupState: EMPTY_OBJ,
    setupContext: null,
    props: EMPTY_OBJ,
    emit: null!,
    emitted: null,
    attrs: EMPTY_OBJ,
    refs: EMPTY_OBJ,

    attrsProxy: null,

    // lifecycle
    isMounted: false,
    isUnmounted: false,
    isUpdating: false,
    // TODO: registory of provides, appContext, lifecycles, ...
    /**
     * @internal
     */
    [VaporLifecycleHooks.BEFORE_MOUNT]: null,
    /**
     * @internal
     */
    [VaporLifecycleHooks.MOUNTED]: null,
    /**
     * @internal
     */
    [VaporLifecycleHooks.BEFORE_UPDATE]: null,
    /**
     * @internal
     */
    [VaporLifecycleHooks.UPDATED]: null,
    /**
     * @internal
     */
    [VaporLifecycleHooks.BEFORE_UNMOUNT]: null,
    /**
     * @internal
     */
    [VaporLifecycleHooks.UNMOUNTED]: null,
    /**
     * @internal
     */
    [VaporLifecycleHooks.RENDER_TRACKED]: null,
    /**
     * @internal
     */
    [VaporLifecycleHooks.RENDER_TRIGGERED]: null,
    /**
     * @internal
     */
    [VaporLifecycleHooks.ACTIVATED]: null,
    /**
     * @internal
     */
    [VaporLifecycleHooks.DEACTIVATED]: null,
    /**
     * @internal
     */
    [VaporLifecycleHooks.ERROR_CAPTURED]: null,
    /**
     * @internal
     */
    // [VaporLifecycleHooks.SERVER_PREFETCH]: null,
  }
  initProps(instance, rawProps, !isFunction(component))
  instance.emit = emit.bind(null, instance)

  return instance
}

function getAttrsProxy(instance: ComponentInternalInstance): Data {
  return (
    instance.attrsProxy ||
    (instance.attrsProxy = new Proxy(
      instance.attrs,
      __DEV__
        ? {
            get(target, key: string) {
              track(instance, TrackOpTypes.GET, '$attrs')
              return target[key]
            },
            set() {
              warn(`setupContext.attrs is readonly.`)
              return false
            },
            deleteProperty() {
              warn(`setupContext.attrs is readonly.`)
              return false
            },
          }
        : {
            get(target, key: string) {
              track(instance, TrackOpTypes.GET, '$attrs')
              return target[key]
            },
          },
    ))
  )
}
