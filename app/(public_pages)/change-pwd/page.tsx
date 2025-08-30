// app/settings/page.tsx (esempio di utilizzo)
"use client"
import ChangePasswordForm from '@/app/components/ChangePasswordForm';

export default function SettingsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">Impostazioni Team</h1>
        <ChangePasswordForm />
      </div>
    </div>
  );
}
