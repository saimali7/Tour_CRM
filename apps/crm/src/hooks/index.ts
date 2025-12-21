export { useDebounce } from "./use-debounce";
export { useLocalStorage, clearLocalStorage } from "./use-local-storage";
export { useKeyboardNavigation, useHotkeys } from "./use-keyboard-navigation";

// Responsive/Media Query hooks
export {
  useMediaQuery,
  useIsMobile,
  useIsTablet,
  useIsDesktop,
  useIsLargeDesktop,
  useIsTouchDevice,
  usePrefersReducedMotion,
  usePrefersDarkMode,
  useResponsive,
  useWindowSize,
  useBreakpoint,
  BREAKPOINTS,
} from "./use-media-query";

// Touch/Gesture hooks
export {
  useSwipe,
  useSwipeToDismiss,
  useSwipeableCarousel,
} from "./use-swipe";
export {
  useFieldValidation,
  useFormValidation,
  useZodFieldValidation,
  type FieldValidationState,
  type UseFieldValidationOptions,
  type UseFieldValidationReturn,
  type FormValidationState,
} from "./use-form-validation";

// Optimistic update hooks
export {
  useTourOptimisticMutations,
  useBookingOptimisticMutations,
  useCustomerOptimisticMutations,
  useGuideOptimisticMutations,
  type OptimisticItem,
  type TourWithScheduleStats,
  type BookingListItem,
  type CustomerListItem,
} from "./use-optimistic-mutations";

export {
  useOptimisticMutation,
  useOptimisticDelete,
  useOptimisticStatusUpdate,
  generateOptimisticId,
  type UseOptimisticMutationOptions,
  type UseOptimisticMutationResult,
  type UseOptimisticDeleteOptions,
  type UseOptimisticStatusUpdateOptions,
} from "./use-optimistic-mutation";
