import { LoginForm } from '@/components/login-form';

export default function Home() {
  return (
    <main className="w-full min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <LoginForm />
    </main>
  );
}
