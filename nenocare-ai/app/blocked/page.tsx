import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function BlockedPage() {
  return (
    <main className="auth-shell">
      <Card className="auth-card">
        <CardHeader>
          <CardTitle>Access blocked</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">
            Your account has been blocked by an administrator. Please contact
            support if you believe this is a mistake.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
