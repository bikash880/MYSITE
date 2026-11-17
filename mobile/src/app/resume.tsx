import { Text, View } from "react-native";
import { Link } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Screen } from "@/components/screen";
import { openLink } from "@/components/social-links";
import { Button, Card, Skeleton } from "@/components/ui";
import {
  useCertificates,
  useEducation,
  useExperiences,
  useProfile,
  useProjects,
  useRefresh,
  useSkills,
} from "@/hooks/use-public-data";
import { mediaUrl } from "@/lib/api";
import { formatDate, formatRange } from "@/lib/utils";
import type { Skill } from "@/lib/types";
import { useTheme } from "@/providers/theme";

function Section({ title, icon, children }: { title: string; icon: React.ComponentProps<typeof Ionicons>["name"]; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <Card className="p-5">
      <View className="mb-4 flex-row items-center gap-2.5">
        <View className="h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
          <Ionicons name={icon} size={16} color={colors.primary} />
        </View>
        <Text className="text-lg font-bold text-foreground" accessibilityRole="header">
          {title}
        </Text>
      </View>
      {children}
    </Card>
  );
}

/** Mobile resume — the same data as the website's /resume page. */
export default function ResumeScreen() {
  const profile = useProfile();
  const experiences = useExperiences();
  const education = useEducation();
  const skills = useSkills();
  const certificates = useCertificates();
  const projects = useProjects();
  const { refreshing, onRefresh } = useRefresh(
    profile.refetch,
    experiences.refetch,
    education.refetch,
    skills.refetch,
    certificates.refetch,
    projects.refetch,
  );

  const p = profile.data!;
  const summary = (p.bio ?? p.short_intro ?? "").split(/\n\s*\n/).filter(Boolean);
  const groups = (skills.data ?? []).reduce<Record<string, Skill[]>>((acc, s) => {
    (acc[s.category] ??= []).push(s);
    return acc;
  }, {});
  const selected = [...(projects.data ?? []).filter((x) => x.featured), ...(projects.data ?? []).filter((x) => !x.featured)].slice(0, 4);

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <View>
        <Text className="text-xs font-bold uppercase tracking-widest text-primary">Resume</Text>
        <Text className="mt-1 text-3xl font-bold text-foreground" accessibilityRole="header">
          {p.full_name}
        </Text>
        <Text className="text-lg text-muted-foreground">{p.title}</Text>
        <View className="mt-3 flex-row flex-wrap gap-x-4 gap-y-1">
          {p.email ? <Text className="text-sm text-muted-foreground" onPress={() => openLink(`mailto:${p.email}`)}>✉ {p.email}</Text> : null}
          {p.phone ? <Text className="text-sm text-muted-foreground">☏ {p.phone}</Text> : null}
          {p.location ? <Text className="text-sm text-muted-foreground">⌖ {p.location}</Text> : null}
        </View>
        {p.cv_url ? (
          <Button title="Download PDF" icon="download-outline" className="mt-5" onPress={() => openLink(mediaUrl(p.cv_url)!)} />
        ) : null}
      </View>

      <Section title="Summary" icon="person-outline">
        {profile.isLoading ? (
          <Skeleton className="h-16" />
        ) : (
          <View className="gap-3">
            {(summary.length ? summary : [p.title]).map((t, i) => (
              <Text key={i} className="text-base leading-6 text-foreground/85">
                {t}
              </Text>
            ))}
          </View>
        )}
      </Section>

      {(experiences.data?.length ?? 0) > 0 && (
        <Section title="Experience" icon="briefcase-outline">
          <View className="gap-5">
            {experiences.data!.map((e) => (
              <View key={e.id}>
                <Text className="font-mono text-xs text-muted-foreground">{formatRange(e.start_date, e.end_date, e.is_current)}</Text>
                <Text className="mt-1 text-base font-semibold text-foreground">
                  {e.role} <Text className="font-normal text-muted-foreground">· {e.company}</Text>
                </Text>
                {e.description ? <Text className="mt-1 text-sm leading-5 text-muted-foreground">{e.description}</Text> : null}
              </View>
            ))}
          </View>
        </Section>
      )}

      {(education.data?.length ?? 0) > 0 && (
        <Section title="Education" icon="school-outline">
          <View className="gap-5">
            {education.data!.map((e) => (
              <View key={e.id}>
                <Text className="font-mono text-xs text-muted-foreground">{formatRange(e.start_date, e.end_date, e.is_current)}</Text>
                <Text className="mt-1 text-base font-semibold text-foreground">{e.degree}</Text>
                <Text className="text-sm text-muted-foreground">{e.institution}</Text>
              </View>
            ))}
          </View>
        </Section>
      )}

      {Object.keys(groups).length > 0 && (
        <Section title="Skills" icon="sparkles-outline">
          <View className="gap-4">
            {Object.entries(groups).map(([cat, list]) => (
              <View key={cat}>
                <Text className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">{cat}</Text>
                <View className="flex-row flex-wrap gap-2">
                  {list.map((s) => (
                    <View key={s.id} className="rounded-full border border-border bg-muted/50 px-3 py-1">
                      <Text className="text-sm text-foreground">{s.name}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        </Section>
      )}

      {(certificates.data?.length ?? 0) > 0 && (
        <Section title="Certifications" icon="ribbon-outline">
          <View className="gap-4">
            {certificates.data!.map((c) => (
              <View key={c.id} className="flex-row items-center justify-between gap-3">
                <View className="flex-1">
                  <Text className="text-base font-semibold text-foreground">{c.title}</Text>
                  <Text className="text-sm text-muted-foreground">
                    {c.issuer} · {formatDate(c.issue_date, false)}
                  </Text>
                </View>
                {c.credential_url ? (
                  <Text className="text-sm font-semibold text-primary" onPress={() => openLink(c.credential_url!)}>
                    Verify
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        </Section>
      )}

      {selected.length > 0 && (
        <Section title="Selected projects" icon="folder-open-outline">
          <View className="gap-4">
            {selected.map((x) => (
              <Link key={x.id} href={`/project/${x.slug}`} asChild>
                <Text className="text-base font-semibold text-foreground" accessibilityRole="link">
                  {x.title} <Text className="text-sm font-normal text-muted-foreground">— {x.summary}</Text>
                </Text>
              </Link>
            ))}
          </View>
        </Section>
      )}
    </Screen>
  );
}
