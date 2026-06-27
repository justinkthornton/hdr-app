import LoginForm from "../../components/LoginForm";

export default function LoginPage(): React.ReactElement {
  return (
    <main className="login-wrap">
      <section className="login-panel">
        <h1>Structure-Locked HDR</h1>
        <LoginForm />
      </section>
    </main>
  );
}
