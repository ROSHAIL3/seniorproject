import PageBreadcrumb from "@/components/common/PageBreadCrumb";

type PlaceholderPageProps = {
  title: string;
};

export default function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <div>
      <PageBreadcrumb pageTitle={title} />
      <div className="min-h-[420px] rounded-2xl border border-gray-200 bg-white px-5 py-12 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10">
        <div className="mx-auto flex h-full max-w-[630px] flex-col items-center justify-center text-center">
          <h3 className="mb-3 text-xl font-semibold text-gray-800 dark:text-white/90">
            {title}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 sm:text-base">
            This page is ready for your project content.
          </p>
        </div>
      </div>
    </div>
  );
}
