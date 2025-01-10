# Effector

### Sample with type guard
Sometimes you need to filter `effector` result and pass it further into `target`, but TypeScript warns you that
types do not align: `error: clock should extend target type`.

To fix this you need to provide a `type guard` as `filter` return value. 

Let's say `getConfigFx` returns `XcmConfig | null` and `calculateFinalConfigFx` accepts only `XcmConfig`.
To make it work we do the following:

```typescript
const getConfigFx = createEffect((config: XcmConfig): XcmConfig | null => {
    // some actions
});

const calculateFinalConfigFx = createEffect((config: XcmConfig): string => {
    // some actions
});

sample({
    clock: getConfigFx.doneData,
    filter: (config: XcmConfig | null): config is XcmConfig => Boolean(config),
    target: calculateFinalConfigFx,
});
```

### AppStarted event
Because `effector` is a pure JS library, it's units could be used in any part of the app.
So in order to emit some important event like `appStarted` we can do the following:
```typescript
// index.tsx - app's entrypoint

const container = document.getElementById('app');
if (!container) {
  throw new Error('Root container is missing in index.html');
}

kernelModel.events.appStarted();

createRoot(container).render(
  <Router>
    <App />
  </Router>
);
```

[Documentation](https://effector.dev/docs/typescript/typing-effector/#filter--fn)
