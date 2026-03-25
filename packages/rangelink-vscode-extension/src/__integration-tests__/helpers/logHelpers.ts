export const createLogger = (suiteName: string): ((msg: string) => void) => {
  const prefix = `[RL-integ:${suiteName}]`;
  return (msg: string) => console.log(`${prefix} ${msg}`); // eslint-disable-line no-undef
};
