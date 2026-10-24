/**
 * Route-level skeleton for /anime/[id].
 * Mirrors the layout of page.tsx (hero + poster, synopsis, episodes, characters,
 * details panel and related carousels) so navigation paints instantly while the
 * RSC tree and the Jikan fetches resolve.
 */
export default function Loading() {
  return (
    <div
      className="min-h-screen bg-zinc-950 text-white animate-pulse"
      role="status"
      aria-busy="true"
    >
      <span className="sr-only">Cargando detalles del anime…</span>

      {/* Hero Section */}
      <section className="relative h-[70vh] w-full flex items-end">
        {/* Backdrop */}
        <div className="absolute inset-0">
          <div className="w-full h-full bg-zinc-900 opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-transparent" />
        </div>

        <div className="container mx-auto px-6 relative z-10 pb-16">
          <div className="flex flex-col md:flex-row gap-8 items-end">
            {/* Poster */}
            <div className="hidden md:block w-64 aspect-[2/3] rounded-2xl bg-zinc-800 border border-white/10 shrink-0 transform -rotate-1" />

            <div className="flex-1">
              {/* Score / year / type badges */}
              <div className="flex items-center gap-3 mb-4">
                <div className="h-7 w-24 rounded-full bg-zinc-800" />
                <div className="h-4 w-16 rounded bg-zinc-800" />
                <div className="h-4 w-12 rounded bg-zinc-800" />
              </div>

              {/* Title + japanese title */}
              <div className="h-12 md:h-16 w-3/4 rounded-2xl bg-zinc-800 mb-4" />
              <div className="h-6 w-1/2 rounded bg-zinc-800 mb-6" />

              {/* Actions: favorite, library, fans */}
              <div className="flex flex-wrap items-center gap-4 mt-8">
                <div className="h-14 w-14 rounded-full bg-zinc-800" />
                <div className="h-14 w-56 rounded-full bg-zinc-800" />
                <div className="flex items-center gap-4">
                  <div className="flex -space-x-4">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="w-10 h-10 rounded-full border-2 border-zinc-950 bg-zinc-800"
                      />
                    ))}
                  </div>
                  <div className="h-4 w-20 rounded bg-zinc-800" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="container mx-auto px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
          {/* Left Column: Synopsis & Characters */}
          <div className="lg:col-span-2">
            <div className="mb-16">
              <div className="border-l-4 border-primary pl-4 mb-6">
                <div className="h-7 w-40 rounded bg-zinc-800" />
              </div>
              <div className="space-y-3">
                <div className="h-4 w-full rounded bg-zinc-800" />
                <div className="h-4 w-11/12 rounded bg-zinc-800" />
                <div className="h-4 w-10/12 rounded bg-zinc-800" />
                <div className="h-4 w-9/12 rounded bg-zinc-800" />
              </div>

              {/* Episodes block */}
              <div className="h-32 w-full bg-zinc-900 rounded-2xl mt-12" />
            </div>

            <div className="mb-16">
              <div className="flex items-end justify-between mb-8">
                <div className="border-l-4 border-primary pl-4">
                  <div className="h-7 w-44 rounded bg-zinc-800" />
                </div>
                <div className="h-4 w-24 rounded bg-zinc-800" />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i}>
                    <div className="aspect-square rounded-2xl mb-3 border border-white/5 bg-zinc-900" />
                    <div className="h-4 w-3/4 rounded bg-zinc-800 mb-2" />
                    <div className="h-3 w-1/2 rounded bg-zinc-800" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Details */}
          <div className="space-y-12">
            <div className="bg-zinc-900/50 rounded-3xl p-8 border border-white/5">
              <div className="h-6 w-32 rounded bg-zinc-800 mb-8" />
              <div className="space-y-6">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i}>
                    <div className="h-3 w-20 rounded bg-zinc-800 mb-2" />
                    <div className="h-4 w-32 rounded bg-zinc-800" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Related Anime Carousels */}
      <section className="container mx-auto px-6 pb-20">
        {[0, 1].map((block) => (
          <div key={block} className="mb-16">
            <div className="border-l-4 border-primary pl-4 mb-8">
              <div className="h-7 w-64 rounded bg-zinc-800" />
            </div>
            <div className="flex gap-4 overflow-hidden pb-4">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex-none w-36">
                  <div className="aspect-[2/3] rounded-2xl bg-zinc-800 border border-white/5" />
                  <div className="h-4 w-3/4 rounded bg-zinc-800 mt-3" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
