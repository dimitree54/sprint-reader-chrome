(function () {
    const root = typeof globalThis !== 'undefined'
        ? globalThis
        : typeof self !== 'undefined'
            ? self
            : typeof window !== 'undefined'
                ? window
                : {};

    const hasBrowser = typeof root.browser !== 'undefined' && root.browser;
    const hasChrome = typeof root.chrome !== 'undefined' && root.chrome;

    if (hasBrowser) {
        if (!hasChrome) {
            root.chrome = root.browser;
        }
        return;
    }

    if (!hasChrome) {
        return;
    }

    root.browser = root.chrome;

    const promisify = (namespace, method) => {
        if (!namespace) return;
        const original = namespace[method];
        if (typeof original !== 'function' || original.__sr_patched__) {
            return;
        }

        namespace[method] = function (...args) {
            const maybeCallback = args[args.length - 1];
            if (typeof maybeCallback === 'function') {
                return original.apply(this, args);
            }

            return new Promise((resolve, reject) => {
                original.call(this, ...args, (...callbackArgs) => {
                    const lastError = root.chrome.runtime && root.chrome.runtime.lastError;
                    if (lastError) {
                        reject(lastError);
                        return;
                    }

                    if (callbackArgs.length <= 1) {
                        resolve(callbackArgs[0]);
                    } else {
                        resolve(callbackArgs);
                    }
                });
            });
        };

        namespace[method].__sr_patched__ = true;
    };

    const patchNamespace = (namespace, methods) => {
        if (!namespace) return;
        methods.forEach((method) => promisify(namespace, method));
    };

    patchNamespace(root.chrome.runtime, ['sendMessage', 'getPlatformInfo']);
    patchNamespace(root.chrome.storage && root.chrome.storage.local, ['get', 'set', 'remove', 'clear']);
    patchNamespace(root.chrome.windows, ['create', 'update', 'get', 'getLastFocused']);
    patchNamespace(root.chrome.tabs, ['query', 'create', 'update']);
})();
