import type { SendOptions } from '../../types';

/**
 * Captures the strategies a service passes to SendRouter.sendToDestination.
 *
 * The strategy closures (sendFn / isEligibleFn) are only executed by the real
 * router, which service tests mock away — so tests invoke the captured closures
 * directly to verify they are wired to the correct destination-manager methods.
 */
export const captureSendStrategies = <T>(sendToDestinationMock: jest.Mock): { get: () => SendOptions<T>['strategies'] } => {
  let strategies: SendOptions<T>['strategies'] | undefined;
  sendToDestinationMock.mockImplementation((options: SendOptions<T>) => {
    strategies = options.strategies;
    return Promise.resolve(undefined);
  });
  return {
    get: (): SendOptions<T>['strategies'] => strategies!,
  };
};
