import { renderHook, act, waitFor } from "@testing-library/react";
import { usePaymentFlow } from "@/hooks/usePaymentFlow";

// モックの設定
jest.mock("@/hooks/use-error-handler", () => ({
  useFormSubmission: () => ({
    loading: false,
    error: null,
    displayInfo: null,
    submit: jest.fn(),
    reset: jest.fn(),
  }),
  useApiCall: () => ({
    call: jest.fn(),
  }),
}));

// フェッチモックの設定
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe("usePaymentFlow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  it("should initialize with correct default values", () => {
    const { result } = renderHook(() => usePaymentFlow());

    expect(result.current.paymentInfo).toBeNull();
    expect(result.current.paymentStatus).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isMonitoring).toBe(false);
    expect(result.current.error).toBeNull();
    expect(typeof result.current.createPayment).toBe("function");
    expect(typeof result.current.resetPayment).toBe("function");
  });

  it("should reset payment state when resetPayment is called", async () => {
    const { result } = renderHook(() => usePaymentFlow());

    // 初期状態から何らかの状態をシミュレート
    act(() => {
      // resetPaymentを呼び出す
      result.current.resetPayment();
    });

    await waitFor(() => {
      expect(result.current.paymentInfo).toBeNull();
      expect(result.current.paymentStatus).toBeNull();
      expect(result.current.isMonitoring).toBe(false);
    });
  });

  it("should have the correct interface", () => {
    const { result } = renderHook(() => usePaymentFlow());

    // 返り値のインターフェースが正しいかチェック
    expect(result.current).toHaveProperty("paymentInfo");
    expect(result.current).toHaveProperty("paymentStatus");
    expect(result.current).toHaveProperty("isLoading");
    expect(result.current).toHaveProperty("isMonitoring");
    expect(result.current).toHaveProperty("error");
    expect(result.current).toHaveProperty("createPayment");
    expect(result.current).toHaveProperty("resetPayment");
  });
});