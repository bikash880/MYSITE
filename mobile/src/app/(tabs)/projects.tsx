import { useMemo, useState } from "react";
import { FlatList, ScrollView } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { ProjectCard } from "@/components/cards";
import { useRefreshControl } from "@/components/screen";
import { Chip, EmptyState, ErrorState, ListSkeleton } from "@/components/ui";
import { useProjects, useRefresh } from "@/hooks/use-public-data";

export default function ProjectsScreen() {
  const { data, isLoading, error, refetch } = useProjects();
  const { refreshing, onRefresh } = useRefresh(refetch);
  const refreshControl = useRefreshControl(refreshing, onRefresh);
  const [category, setCategory] = useState("All");

  const categories = useMemo(() => ["All", ...Array.from(new Set((data ?? []).map((p) => p.category))).sort()], [data]);
  const filtered = category === "All" ? data ?? [] : (data ?? []).filter((p) => p.category === category);

  return (
    <FlatList
      data={isLoading ? [] : filtered}
      keyExtractor={(p) => p.id}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 48 }}
      refreshControl={refreshControl}
      ListHeaderComponent={
        categories.length > 2 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} accessibilityRole="tablist">
            {categories.map((c) => (
              <Chip key={c} label={c} active={c === category} onPress={() => setCategory(c)} />
            ))}
          </ScrollView>
        ) : null
      }
      ListEmptyComponent={
        isLoading ? (
          <ListSkeleton />
        ) : error && !data ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : (
          <EmptyState icon="folder-open-outline" title="No projects yet" description="Projects appear here once published." />
        )
      }
      renderItem={({ item }) => (
        <Animated.View entering={FadeIn}>
          <ProjectCard project={item} />
        </Animated.View>
      )}
    />
  );
}
