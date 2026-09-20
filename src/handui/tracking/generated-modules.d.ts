declare module '*.mjs' {
  const moduleFactory: (moduleArg?: object) => Promise<unknown>;
  export default moduleFactory;
}
