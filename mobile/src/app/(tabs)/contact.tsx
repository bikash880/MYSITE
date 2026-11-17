import { useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { onlineManager } from "@tanstack/react-query";
import { Screen } from "@/components/screen";
import { openLink, SocialLinks } from "@/components/social-links";
import { toast } from "@/components/toast";
import { Button, Card, FieldMessage, Input, Label } from "@/components/ui";
import { useProfile } from "@/hooks/use-public-data";
import { api, ApiError, isApiConfigured } from "@/lib/api";
import { contactSchema, fieldErrors, type ContactInput } from "@/lib/validations";
import { useTheme } from "@/providers/theme";

const EMPTY: ContactInput = { name: "", email: "", subject: "", message: "" };

export default function ContactScreen() {
  const { colors } = useTheme();
  const { data: profile } = useProfile();
  const [values, setValues] = useState<ContactInput>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const refs = {
    email: useRef<TextInput>(null),
    subject: useRef<TextInput>(null),
    message: useRef<TextInput>(null),
  };

  const set = (k: keyof ContactInput) => (v: string) => {
    setValues((s) => ({ ...s, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: "" }));
  };

  async function submit() {
    const parsed = contactSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      toast.error("Please fix the highlighted fields.");
      return;
    }
    if (!isApiConfigured) return toast.error("The contact form isn't configured yet.");
    if (!onlineManager.isOnline()) return toast.error("You're offline", "Connect to the internet to send your message.");

    setSending(true);
    try {
      await api("/api/messages", { method: "POST", body: parsed.data });
    } catch (e) {
      if (e instanceof ApiError && e.fieldErrors) setErrors(e.fieldErrors);
      return toast.error("Could not send your message", e instanceof ApiError && e.status ? e.message : "Please try again later.");
    } finally {
      setSending(false);
    }
    toast.success("Message sent!", "Thanks — I'll get back to you soon.");
    setValues(EMPTY);
    setErrors({});
  }

  const details = [
    profile?.email && { icon: "mail-outline" as const, label: "Email", value: profile.email, href: `mailto:${profile.email}` },
    profile?.phone && { icon: "call-outline" as const, label: "Phone", value: profile.phone, href: `tel:${profile.phone.replace(/\s/g, "")}` },
    profile?.location && { icon: "location-outline" as const, label: "Location", value: profile.location },
  ].filter(Boolean) as { icon: "mail-outline"; label: string; value: string; href?: string }[];

  return (
    <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
      <Screen>
        <View>
          <Text className="text-xs font-bold uppercase tracking-widest text-primary">Contact</Text>
          <Text className="mt-1 text-3xl font-bold text-foreground" accessibilityRole="header">
            Let&apos;s work together
          </Text>
          <Text className="mt-1 text-base text-muted-foreground">Send a message and I&apos;ll reply as soon as possible.</Text>
        </View>

        <Card className="gap-4 p-5">
          <View>
            <Label required>Name</Label>
            <Input value={values.name} onChangeText={set("name")} placeholder="Jane Doe" autoComplete="name" textContentType="name"
              returnKeyType="next" onSubmitEditing={() => refs.email.current?.focus()} invalid={Boolean(errors.name)} />
            <FieldMessage error={errors.name} />
          </View>
          <View>
            <Label required>Email</Label>
            <Input ref={refs.email} value={values.email} onChangeText={set("email")} placeholder="jane@company.com" keyboardType="email-address"
              autoCapitalize="none" autoComplete="email" textContentType="emailAddress" returnKeyType="next"
              onSubmitEditing={() => refs.subject.current?.focus()} invalid={Boolean(errors.email)} />
            <FieldMessage error={errors.email} />
          </View>
          <View>
            <Label required>Subject</Label>
            <Input ref={refs.subject} value={values.subject} onChangeText={set("subject")} placeholder="Project inquiry" returnKeyType="next"
              onSubmitEditing={() => refs.message.current?.focus()} invalid={Boolean(errors.subject)} />
            <FieldMessage error={errors.subject} />
          </View>
          <View>
            <Label required>Message</Label>
            <Input ref={refs.message} value={values.message} onChangeText={set("message")} multiline
              placeholder="Tell me about your project, timeline and budget…" invalid={Boolean(errors.message)} />
            <FieldMessage error={errors.message} />
          </View>
          <Button title="Send message" icon="send" loading={sending} onPress={submit} />
        </Card>

        {details.map((d) => (
          <Pressable key={d.label} disabled={!d.href} onPress={() => d.href && openLink(d.href)} accessibilityRole={d.href ? "link" : "text"}>
            <Card className="flex-row items-center gap-4 p-4">
              <View className="h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
                <Ionicons name={d.icon} size={20} color={colors.primary} />
              </View>
              <View className="flex-1">
                <Text className="text-xs uppercase tracking-wider text-muted-foreground">{d.label}</Text>
                <Text className="font-medium text-foreground">{d.value}</Text>
              </View>
            </Card>
          </Pressable>
        ))}

        {profile ? (
          <Card className="p-5">
            <Text className="mb-3 text-xs uppercase tracking-wider text-muted-foreground">Find me online</Text>
            <SocialLinks profile={profile} />
          </Card>
        ) : null}
      </Screen>
    </KeyboardAvoidingView>
  );
}
