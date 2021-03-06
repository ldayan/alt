import assign from 'object-assign'
import AltStore from '../AltStore'
import { StoreMixinListeners, StoreMixinEssentials } from './StoreMixins'
import getInternalMethods from './getInternalMethods'
import {
  ALL_LISTENERS,
  LIFECYCLE,
  LISTENERS,
  PUBLIC_METHODS,
  STATE_CHANGED,
  STATE_CONTAINER
} from '../symbols/symbols'

function doSetState(store, storeInstance, state) {
  if (!state) {
    return
  }

  if (!store.alt.dispatcher.isDispatching()) {
    throw new Error('You can only use setState while dispatching')
  }

  const nextState = typeof state === 'function'
    ? state(storeInstance[STATE_CONTAINER])
    : state

  storeInstance[STATE_CONTAINER] = store.alt.setState(
    storeInstance[STATE_CONTAINER],
    nextState
  )
  storeInstance[STATE_CHANGED] = true
}

export function createStoreFromObject(alt, StoreModel, key) {
  let storeInstance

  const StoreProto = {}
  StoreProto[ALL_LISTENERS] = []
  StoreProto[LIFECYCLE] = {}
  StoreProto[LISTENERS] = {}

  assign(StoreProto, {
    _storeName: key,
    alt,
    dispatcher: alt.dispatcher,
    getInstance() {
      return storeInstance
    },
    setState(nextState) {
      doSetState(this, storeInstance, nextState)
    }
  }, StoreMixinListeners, StoreMixinEssentials, StoreModel)

  // bind the store listeners
  /* istanbul ignore else */
  if (StoreProto.bindListeners) {
    StoreMixinListeners.bindListeners.call(
      StoreProto,
      StoreProto.bindListeners
    )
  }

  // bind the lifecycle events
  /* istanbul ignore else */
  if (StoreProto.lifecycle) {
    Object.keys(StoreProto.lifecycle).forEach((event) => {
      StoreMixinListeners.on.call(
        StoreProto,
        event,
        StoreProto.lifecycle[event]
      )
    })
  }

  // create the instance and assign the public methods to the instance
  storeInstance = assign(
    new AltStore(alt, StoreProto, StoreProto.state, StoreModel),
    StoreProto.publicMethods
  )

  return storeInstance
}

export function createStoreFromClass(alt, StoreModel, key, ...argsForClass) {
  let storeInstance

  // Creating a class here so we don't overload the provided store's
  // prototype with the mixin behaviour and I'm extending from StoreModel
  // so we can inherit any extensions from the provided store.
  class Store extends StoreModel {
    constructor(...args) {
      super(...args)
    }
  }

  assign(Store.prototype, StoreMixinListeners, StoreMixinEssentials, {
    _storeName: key,
    alt: alt,
    dispatcher: alt.dispatcher,
    getInstance() {
      return storeInstance
    },
    setState(nextState) {
      doSetState(this, storeInstance, nextState)
    }
  })

  Store.prototype[ALL_LISTENERS] = []
  Store.prototype[LIFECYCLE] = {}
  Store.prototype[LISTENERS] = {}
  Store.prototype[PUBLIC_METHODS] = {}

  const store = new Store(...argsForClass)

  storeInstance = assign(
    new AltStore(
      alt,
      store,
      typeof alt._stateKey === 'string'
        ? store[alt._stateKey]
        : null,
        StoreModel
    ),
    getInternalMethods(StoreModel)
  )

  return storeInstance
}
