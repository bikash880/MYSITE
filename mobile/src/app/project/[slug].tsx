import { Share, Text, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { API_URL } from "@/lib/api";
import Animated, { FadeInDown } from "react-native-reanimated";
import { HtmlView } from "@/components/html-view";
import { Screen } from "@/components/screen";
import { openLink } from "@/components/social-links";
import { Button, EmptyState, ErrorState, IconButton, Image, Skeleton } from "@/components/ui";
import { useProject, useRefresh } from "@/hooks/use-public-data";

const SITE = API_URL || undefined;

export default function ProjectDetail() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data: project, isLoading, error, refetch } = useProject(slug);
  const { refreshing, onRefresh } = useRefresh(refetch);

  if (isLoading && !project) {
    return (
      <Screen>
        <Skeleton className="aspect-video w-full" />
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-20 w-full" />
      </Screen>
    );
  }
  if (!project) {
    return (
      <Screen refreshing={refreshing} onRefresh={onRefresh}>
        {error ? <ErrorState error={error} onRetry={refetch} /> : <EmptyState icon="search-outline" title="Project not found" />}
      </Screen>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: project.title,
          headerRight: SITE
            ? () => (
                <IconButton
                  icon="share-outline"
                  label="Share project"
                  onPress={() => Share.share({ message: `${project.title} — ${SITE}/projects/${project.slug}` })}
                />
              )
            : undefined,
        }}
      />
      <Screen refreshing={refreshing} onRefresh={onRefresh}>
        <Animated.View entering={FadeInDown}>
          {project.image_url ? (
            <Image source={{ uri: project.image_url }} className="aspect-video w-full rounded-3xl" contentFit="cover" transition={250} />
          ) : null}
          <Text className="mt-5 text-xs font-bold uppercase tracking-widest text-primary">{project.category}</Text>
          <Text className="mt-1 text-3xl font-bold text-foreground" accessibilityRole="header">
            {project.title}
          </Text>
          <Text className="mt-3 text-base leading-6 text-muted-foreground">{project.summary}</Text>

          {(project.live_url || project.github_url) && (
            <View className="mt-5 flex-row gap-3">
              {project.live_url ? <Button title="Live demo" icon="open-outline" className="flex-1" onPress={() => openLink(project.live_url!)} /> : null}
              {project.github_url ? (
                <Button title="Source" icon="logo-github" variant="outline" className="flex-1" onPress={() => openLink(project.github_url!)} />
              ) : null}
            </View>
          )}

          {project.tech.length > 0 && (
            <View className="mt-6">
              <Text className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Tech stack</Text>
              <View className="flex-row flex-wrap gap-2">
                {project.tech.map((t) => (
                  <View key={t} className="rounded-xl border border-border bg-card px-3 py-1">
                    <Text className="text-sm text-foreground">{t}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </Animated.View>

        {project.content ? <HtmlView html={project.content} /> : null}
      </Screen>
    </>
  );
}
