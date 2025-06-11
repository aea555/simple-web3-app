type GlobalErrorDisplayProps = {
  error: string | null;
};

export default function GlobalErrorDisplay({ error }: GlobalErrorDisplayProps) {
  return (
    <>
      {/* Global Error Display */}
      {error && (
        <div className="p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-lg border border-red-200 dark:border-red-700">
          <p className="font-medium">Error:</p>
          <p className="text-sm">{error}</p>
        </div>
      )}
    </>
  );
}
