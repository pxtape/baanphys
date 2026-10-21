import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LoginForm } from "@/components/LoginForm";

const { signInWithOtp, signInWithPassword } = vi.hoisted(() => ({ signInWithOtp: vi.fn(), signInWithPassword: vi.fn() }));

vi.mock("@/lib/supabase/config", () => ({ isSupabaseConfigured: () => true }));
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: {
    signInWithOtp,
    signInWithPassword,
    getSession: () => Promise.resolve({ data: { session: null } }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
  } }),
}));

describe("LoginForm", () => {
  afterEach(cleanup);
  beforeEach(() => {
    vi.clearAllMocks();
    signInWithOtp.mockResolvedValue({ error: null });
    signInWithPassword.mockResolvedValue({ error: { message: "Invalid login credentials" } });
  });

  it("defaults to username/password and uses the normalized internal Auth email", async () => {
    render(<LoginForm />);
    fireEvent.change(screen.getByLabelText("Username"), { target: { value: "  STUDENT_01  " } });
    fireEvent.change(screen.getByLabelText("รหัสผ่าน"), { target: { value: "the-student-password" } });
    fireEvent.click(screen.getByRole("button", { name: "เข้าสู่ห้องเรียน" }));
    expect(await screen.findByText(/Username หรือรหัสผ่านไม่ถูกต้อง/)).toBeInTheDocument();
    expect(signInWithPassword).toHaveBeenCalledWith({ email: "student_01@classroom.invalid", password: "the-student-password" });
    expect(signInWithOtp).not.toHaveBeenCalled();
  });

  it("rejects email addresses in username mode without querying Auth", async () => {
    render(<LoginForm />);
    fireEvent.change(screen.getByLabelText("Username"), { target: { value: "student@example.com" } });
    fireEvent.change(screen.getByLabelText("รหัสผ่าน"), { target: { value: "password" } });
    fireEvent.click(screen.getByRole("button", { name: "เข้าสู่ห้องเรียน" }));
    expect(await screen.findByText(/Username ต้องมี 3–40 ตัว/)).toBeInTheDocument();
    expect(signInWithPassword).not.toHaveBeenCalled();
  });

  it("sends a magic link only for an existing account to the application callback", async () => {
    render(<LoginForm />);
    fireEvent.click(screen.getByRole("button", { name: "บัญชีอีเมลเดิม" }));
    fireEvent.change(screen.getByLabelText("อีเมลของคุณ"), { target: { value: "student@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "ส่งลิงก์เข้าสู่ระบบ" }));
    expect(await screen.findByText(/หากอีเมลนี้มีบัญชีเดิมอยู่/)).toBeInTheDocument();
    expect(signInWithOtp).toHaveBeenCalledWith({
      email: "student@example.com",
      options: { emailRedirectTo: "http://localhost:3000/auth/callback?next=%2Fcourses", shouldCreateUser: false },
    });
  });

  it("explains when Supabase blocks repeated email requests", async () => {
    signInWithOtp.mockResolvedValueOnce({ error: { message: "email rate limit exceeded" } });
    render(<LoginForm />);
    fireEvent.click(screen.getByRole("button", { name: "บัญชีอีเมลเดิม" }));
    fireEvent.change(screen.getByLabelText("อีเมลของคุณ"), { target: { value: "student@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "ส่งลิงก์เข้าสู่ระบบ" }));
    expect(await screen.findByText(/จำกัดการส่งอีเมลชั่วคราว/)).toBeInTheDocument();
  });

  it("recovers from a network exception and re-enables login", async () => {
    signInWithPassword.mockRejectedValueOnce(new Error("network unavailable"));
    render(<LoginForm />);
    fireEvent.change(screen.getByLabelText("Username"), { target: { value: "student01" } });
    fireEvent.change(screen.getByLabelText("รหัสผ่าน"), { target: { value: "password" } });
    fireEvent.click(screen.getByRole("button", { name: "เข้าสู่ห้องเรียน" }));
    expect(await screen.findByText(/เชื่อมต่อระบบไม่ได้/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "เข้าสู่ห้องเรียน" })).not.toBeDisabled();
  });
});
