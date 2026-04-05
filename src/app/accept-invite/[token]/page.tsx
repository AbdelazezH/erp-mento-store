"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Package, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type TokenState =
  | { status: "loading" }
  | { status: "valid"; email: string; role: string; expiresAt: string }
  | { status: "invalid"; message: string };

export default function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();

  const [tokenState, setTokenState] = useState<TokenState>({ status: "loading" });
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/users/invite/${token}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) setTokenState({ status: "invalid", message: data.error ?? "Invalid invitation" });
        else setTokenState({ status: "valid", email: data.email, role: data.role, expiresAt: data.expiresAt });
      })
      .catch(() => setTokenState({ status: "invalid", message: "Could not verify invitation" }));
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { toast.error("Passwords do not match"); return; }
    if (password.length < 8) { toast.error("Password must be at least 8 characters"); return; }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/users/invite/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, password, confirmPassword: confirm }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to accept invitation");
      toast.success("Welcome to Nexus ERP!");
      router.push("/");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="w-full max-w-md px-4">
        <div className="flex justify-center mb-8">
          <div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
            <Package className="h-8 w-8 text-white" />
          </div>
        </div>

        {tokenState.status === "loading" && (
          <Card>
            <CardContent className="pt-8 pb-8 flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-muted-foreground text-sm">Verifying invitation...</p>
            </CardContent>
          </Card>
        )}

        {tokenState.status === "invalid" && (
          <Card>
            <CardContent className="pt-8 pb-8 flex flex-col items-center gap-3 text-center">
              <XCircle className="h-10 w-10 text-destructive" />
              <h2 className="font-semibold text-lg">Invitation Invalid</h2>
              <p className="text-muted-foreground text-sm">{tokenState.message}</p>
              <p className="text-xs text-muted-foreground">Please ask your admin to send a new invitation.</p>
            </CardContent>
          </Card>
        )}

        {tokenState.status === "valid" && (
          <Card>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-2">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
              <CardTitle>You're invited!</CardTitle>
              <CardDescription>
                Set up your account for <strong>{tokenState.email}</strong>
              </CardDescription>
              <div className="flex justify-center mt-1">
                <Badge variant={tokenState.role === "admin" ? "default" : "secondary"} className="capitalize">
                  {tokenState.role}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    placeholder="At least 8 characters"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm">Confirm Password</Label>
                  <Input
                    id="confirm"
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? "Creating account..." : "Create Account & Sign In"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
