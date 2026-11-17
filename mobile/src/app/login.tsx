import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Screen } from "@/components/screen";
import { toast } from "@/components/toast";
import { Button, FieldMessage, Input, Label } from "@/components/ui";
import { isApiConfigured } from "@/lib/api";
import { fieldErrors, loginSchema } from "@/lib/validations";
import { useAuth, type OtpChallenge } from "@/providers/auth";
import { useTheme } from "@/providers/theme";

const RESEND_SECONDS = 60;

/** Two-step admin sign-in: password, then the 6-digit code emailed to the admin. */
export default function LoginScreen() {
  const { signIn } = useAuth();
  const { colors } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [challenge, setChallenge] = useState<OtpChallenge | null>(null);
  const passwordRef = useRef<TextInput>(null);

  async function submit() {
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    setLoading(true);
    const res = await signIn(parsed.data.email, parsed.data.password);
    setLoading(false);
    if (res.error || !res.challenge) return toast.error("Sign in failed", res.error);
    setPassword("");
    setChallenge(res.challenge);
    toast.success("Check your email", `Code sent to ${res.challenge.maskedEmail}`);
  }

  if (challenge) return <OtpStep challenge={challenge} onChallenge={setChallenge} onRestart={() => setChallenge(null)} />;

  return (
    <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Screen>
        <View className="items-center pb-2 pt-6">
          <View className="h-14 w-14 items-center justify-center rounded-2xl bg-primary">
            <Ionicons name="shield-checkmark" size={26} color="#fff" />
          </View>
          <Text className="mt-4 text-2xl font-bold text-foreground">Admin sign in</Text>
          <Text className="mt-1 text-center text-sm text-muted-foreground">Password first, then a code sent to your email.</Text>
        </View>

        {!isApiConfigured && (
          <View className="rounded-2xl bg-warning/15 p-3">
            <Text className="text-sm text-warning">The API isn&apos;t configured. Set EXPO_PUBLIC_API_URL in .env.local (see README).</Text>
          </View>
        )}

        <View>
          <Label>Admin email</Label>
          <Input
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="username"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            invalid={Boolean(errors.email)}
          />
          <FieldMessage error={errors.email} />
        </View>
        <View>
          <Label>Password</Label>
          <View className="justify-center">
            <Input
              ref={passwordRef}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!show}
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={submit}
              invalid={Boolean(errors.password)}
              className="pr-12"
            />
            <Pressable
              onPress={() => setShow((s) => !s)}
              className="absolute right-1 h-10 w-10 items-center justify-center"
              accessibilityLabel={show ? "Hide password" : "Show password"}
            >
              <Ionicons name={show ? "eye-off-outline" : "eye-outline"} size={20} color={colors.mutedForeground} />
            </Pressable>
          </View>
          <FieldMessage error={errors.password} />
        </View>
        <Button title="Continue" icon="arrow-forward" loading={loading} onPress={submit} disabled={!isApiConfigured} />
      </Screen>
    </KeyboardAvoidingView>
  );
}

function OtpStep({
  challenge,
  onChallenge,
  onRestart,
}: {
  challenge: OtpChallenge;
  onChallenge: (c: OtpChallenge) => void;
  onRestart: () => void;
}) {
  const { verifyCode, resendCode } = useAuth();
  const { colors } = useTheme();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function verify(value = code) {
    if (!/^\d{6}$/.test(value)) return setError("Enter the 6-digit code");
    setError("");
    setLoading(true);
    const res = await verifyCode(challenge.challengeId, value);
    setLoading(false);
    if (res.error) {
      setError(res.error);
      setCode("");
      toast.error("Verification failed", res.error);
      if (res.restart) onRestart();
      return;
    }
    toast.success("Welcome back!");
    router.replace("/admin");
  }

  return (
    <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Screen>
        <View className="items-center pb-2 pt-6">
          <View className="h-14 w-14 items-center justify-center rounded-2xl bg-primary/15">
            <Ionicons name={challenge.delivery === "email" ? "mail-open-outline" : "terminal-outline"} size={26} color={colors.primary} />
          </View>
          <Text className="mt-4 text-2xl font-bold text-foreground">Check your email</Text>
          <Text className="mt-1 text-center text-sm text-muted-foreground">
            {challenge.delivery === "email"
              ? `Enter the 6-digit code sent to ${challenge.maskedEmail}. It expires in 10 minutes.`
              : "Email isn't configured on the server yet — the code was printed in the server terminal (development only)."}
          </Text>
        </View>

        <View>
          <Label>Verification code</Label>
          <Input
            value={code}
            onChangeText={(t) => {
              const digits = t.replace(/\D/g, "").slice(0, 6);
              setCode(digits);
              setError("");
              if (digits.length === 6) verify(digits);
            }}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="one-time-code"
            maxLength={6}
            autoFocus
            invalid={Boolean(error)}
            className="text-center font-mono text-2xl tracking-[8px]"
            accessibilityLabel="6-digit verification code"
          />
          <FieldMessage error={error} />
        </View>

        <Button title="Verify & sign in" icon="shield-checkmark-outline" loading={loading} onPress={() => verify()} disabled={code.length !== 6} />

        <View className="flex-row items-center justify-between">
          <Pressable onPress={onRestart} accessibilityRole="button" className="flex-row items-center gap-1 py-2">
            <Ionicons name="arrow-back" size={16} color={colors.mutedForeground} />
            <Text className="text-sm text-muted-foreground">Use a different account</Text>
          </Pressable>
          <Pressable
            disabled={cooldown > 0}
            accessibilityRole="button"
            onPress={async () => {
              const res = await resendCode(challenge.challengeId);
              if (res.error || !res.challenge) return toast.error("Couldn't resend", res.error);
              onChallenge(res.challenge);
              setCooldown(RESEND_SECONDS);
              toast.success("A new code has been sent");
            }}
            className="py-2"
          >
            <Text className={cooldown > 0 ? "text-sm text-muted-foreground" : "text-sm font-semibold text-primary"}>
              {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
            </Text>
          </Pressable>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
