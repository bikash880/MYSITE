import { FlatList, Text, View } from "react-native";
import { router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { CertificateCard, ProjectCard } from "@/components/cards";
import { Screen } from "@/components/screen";
import { openLink, SocialLinks } from "@/components/social-links";
import { Button, Card, Image, SectionHeader, Skeleton } from "@/components/ui";
import { useCertificates, useProfile, useProjects, useRefresh } from "@/hooks/use-public-data";
import { isApiConfigured, mediaUrl } from "@/lib/api";
import { initials } from "@/lib/utils";
import { useTheme } from "@/providers/theme";

export default function HomeScreen() {
  const { colors } = useTheme();
  const profile = useProfile();
  const projects = useProjects();
  const certificates = useCertificates();
  const { refreshing, onRefresh } = useRefresh(profile.refetch, projects.refetch, certificates.refetch);
  const featuredCerts = [...(certificates.data ?? []).filter((c) => c.featured), ...(certificates.data ?? []).filter((c) => !c.featured)].slice(0, 5);

  const p = profile.data!;
  const featuredAll = projects.data?.filter((x) => x.featured) ?? [];
  const featured = (featuredAll.length ? featuredAll : projects.data ?? []).slice(0, 5);

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh} padded={false}>
      {!isApiConfigured && (
        <View className="mx-4 mt-4 rounded-2xl bg-warning/15 p-3">
          <Text className="text-sm text-warning">The API isn&apos;t configured — set EXPO_PUBLIC_API_URL in .env.local (see README).</Text>
        </View>
      )}

      {/* Hero */}
      <Animated.View entering={FadeInDown.duration(500)} className="items-center px-6 pb-8 pt-6">
        <View className="h-36 w-36 overflow-hidden rounded-[40px] border border-border bg-card" style={{ shadowColor: colors.primary, shadowOpacity: 0.35, shadowRadius: 30, elevation: 12 }}>
          {p.photo_url ? (
            <Image source={{ uri: p.photo_url }} className="h-full w-full" contentFit="cover" transition={300} accessibilityLabel={`Photo of ${p.full_name}`} />
          ) : (
            <View className="h-full w-full items-center justify-center bg-primary/20">
              <Text className="text-5xl font-bold text-primary">{initials(p.full_name)}</Text>
            </View>
          )}
        </View>

        {p.available && (
          <View className="mt-5 flex-row items-center gap-2 rounded-full border border-border bg-card px-3 py-1">
            <View className="h-2 w-2 rounded-full bg-success" />
            <Text className="text-xs font-medium text-muted-foreground">Available for new projects</Text>
          </View>
        )}

        <Text className="mt-4 text-base text-muted-foreground">Hi, I&apos;m</Text>
        {profile.isLoading ? (
          <Skeleton className="mt-2 h-9 w-56" />
        ) : (
          <Text className="text-center text-4xl font-bold tracking-tight text-foreground" accessibilityRole="header">
            {p.full_name}
          </Text>
        )}
        <Text className="mt-1 text-center text-xl font-semibold text-primary">{p.title}</Text>
        {p.short_intro ? <Text className="mt-3 text-center text-base leading-6 text-muted-foreground">{p.short_intro}</Text> : null}
        {p.location ? (
          <View className="mt-2 flex-row items-center gap-1">
            <Ionicons name="location-outline" size={14} color={colors.mutedForeground} />
            <Text className="text-sm text-muted-foreground">{p.location}</Text>
          </View>
        ) : null}

        <View className="mt-6 w-full flex-row gap-3">
          <Button title="Hire Me" icon="arrow-forward" className="flex-1" onPress={() => router.navigate("/contact")} />
          <Button title="Resume" icon="document-text-outline" variant="outline" className="flex-1" onPress={() => router.push("/resume")} />
        </View>
        <View className="mt-6">
          <SocialLinks profile={p} center />
        </View>
      </Animated.View>

      {/* Featured projects */}
      {featured.length > 0 && (
        <View className="pb-8">
          <View className="px-4">
            <SectionHeader
              eyebrow="Portfolio"
              title="Featured work"
              action={<Button title="All" size="sm" variant="ghost" onPress={() => router.navigate("/projects")} textClassName="text-primary" />}
            />
          </View>
          <FlatList
            horizontal
            data={featured}
            keyExtractor={(x) => x.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
            renderItem={({ item }) => <ProjectCard project={item} compact />}
          />
        </View>
      )}

      {/* Certificates */}
      {featuredCerts.length > 0 && (
        <View className="pb-8">
          <View className="px-4">
            <SectionHeader
              eyebrow="Certificates"
              title="Credentials"
              action={<Button title="All" size="sm" variant="ghost" onPress={() => router.navigate("/certificates")} textClassName="text-primary" />}
            />
          </View>
          <FlatList
            horizontal
            data={featuredCerts}
            keyExtractor={(x) => x.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
            renderItem={({ item }) => <CertificateCard cert={item} compact />}
          />
        </View>
      )}

      {/* Resume */}
      <View className="px-4 pb-8">
        <Card className="flex-row items-center gap-4 p-5">
          <View className="h-12 w-12 items-center justify-center rounded-2xl bg-primary">
            <Ionicons name="document-text" size={22} color="#fff" />
          </View>
          <View className="flex-1">
            <Text className="text-lg font-bold text-foreground">My resume</Text>
            <Text className="text-sm text-muted-foreground">Experience, education, skills & certifications.</Text>
          </View>
          <Button title="Open" size="sm" onPress={() => router.push("/resume")} />
        </Card>
        {p.cv_url ? (
          <Button title="Download PDF" icon="download-outline" variant="ghost" className="mt-2" onPress={() => openLink(mediaUrl(p.cv_url)!)} />
        ) : null}
      </View>

      {/* CTA */}
      <View className="px-4">
        <Card className="items-center p-6">
          <Text className="text-center text-2xl font-bold text-foreground">Have a project in mind?</Text>
          <Text className="mt-2 text-center text-muted-foreground">Let&apos;s build something great together.</Text>
          <Button title="Get in touch" icon="send" className="mt-5 self-stretch" onPress={() => router.navigate("/contact")} />
        </Card>
      </View>
    </Screen>
  );
}
