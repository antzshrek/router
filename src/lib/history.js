////////////////////////////////////////////////////////////////////////////////
// createHistory(source) - wraps a history source
let createHistory = (source, options) => {
  let listeners = [];
  let location = { ...source.location };
  let transitioning = false;
  let resolveTransition = null;

  return {
    get location() {
      return location;
    },

    get transitioning() {
      return transitioning;
    },

    _onTransitionComplete() {
      transitioning = false;
      resolveTransition();
    },

    listen(listener) {
      listeners.push(listener);

      const popstateListener = () => {
        location = { ...source.location };
        listener();
      };

      source.addEventListener("popstate", popstateListener);

      return () => {
        source.removeEventListener("popstate", popstateListener);
        listeners = listeners.filter(fn => fn !== listener);
      };
    },

    navigate(to, { state = null, replace = false } = {}) {
      // try...catch iOS Safari limits to 100 pushState calls
      try {
        if (transitioning || replace) {
          source.history.replaceState(state, null, to);
        } else {
          source.history.pushState(state, null, to);
        }
      } catch (e) {
        window.location[replace ? "replace" : "assign"](to);
      }

      location = { ...source.location };
      transitioning = true;
      const transition = new Promise(res => {
        resolveTransition = res;
      });
      listeners.forEach(fn => fn());
      return transition;
    }
  };
};

////////////////////////////////////////////////////////////////////////////////
// Stores history entries in memory for testing or other platforms like Native
let createMemorySource = (initialPathname = "/") => {
  let index = 0;
  let stack = [{ pathname: initialPathname }];
  let states = [];

  return {
    get location() {
      return stack[index];
    },
    addEventListener(name, fn) {},
    removeEventListener(name, fn) {},
    history: {
      get entries() {
        return stack;
      },
      get index() {
        return index;
      },
      get state() {
        return states[index];
      },
      pushState(state, _, pathname) {
        index++;
        stack.push({ pathname });
        states.push(state);
      },
      replaceState(state, _, pathname) {
        stack[index] = { pathname };
        states[index] = state;
      }
    }
  };
};

////////////////////////////////////////////////////////////////////////////////
// global history - uses window.history as the source if available, otherwise a
// memory history
let canUseDOM = !!(
  typeof window !== "undefined" &&
  window.document &&
  window.document.createElement
);
let getSource = () => {
  return canUseDOM ? window : createMemorySource();
};

let globalHistory = createHistory(getSource());
let { navigate } = globalHistory;

////////////////////////////////////////////////////////////////////////////////
export { globalHistory, navigate, createHistory, createMemorySource };