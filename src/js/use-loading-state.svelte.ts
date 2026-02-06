export type LoadingState =
  | { loading: true, error: null }
  | { loading: false, error: string | null };

type SetLoadingStateFn = (loadingOrError: boolean | string) => void;

export function useLoadingState(defaultIsLoading: boolean) {
  let state = $state<LoadingState>(
    defaultIsLoading
      ? { loading: true, error: null }
      : { loading: false, error: null }
  );

  const setLoadingState: SetLoadingStateFn = (value) => {
    if (value === true) {
      state = {
        loading: true,
        error: null,
      }
    } else {
      state = {
        loading: false,
        error: typeof value === "string" ? value : null,
      }
    }
  }

  return {
    get state() { return state; },
    setLoadingState,
  }
}
