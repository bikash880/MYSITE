import type { Metadata } from "next";
import { PageHeader } from "@/components/site/section";
import { ProjectsGrid } from "@/components/site/projects-grid";
import { getProjects } from "@/lib/data";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Projects",
  description: "A selection of projects I've designed and built.",
  alternates: { canonical: "/projects" },
};

export default async function ProjectsPage() {
  const projects = await getProjects();
  return (
    <>
      <PageHeader
        eyebrow={`Portfolio · ${projects.length} project${projects.length === 1 ? "" : "s"}`}
        title="Selected *work*"
        description="Products, platforms and experiments I've designed and built. Filter by category to explore."
      />
      <section className="container-page pb-8">
        <ProjectsGrid projects={projects} />
      </section>
    </>
  );
}
