import { Metadata } from 'next';
import Image from 'next/image';
import { Layout } from '@/components/layout/Layout';

export const metadata: Metadata = {
  title: 'Home - APSAS Web',
  description: 'Programming Assessment is now effortless',
};

export default function HomePage() {
  return (
    <Layout>
      <section className="bg-white">
        <div className="bg-[#00a1a9]">
          <div className="mx-auto px-6 py-16 md:py-20">
            <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-10">
              <div className="space-y-6 ml-10">
                <h1 className="text-5xl md:text-6xl font-extrabold leading-tight">
                  <span className="text-[#ff8b2a]">Programming</span>
                  <br />
                  <span className="text-[#ff8b2a]">Assessment</span>
                  <span className="text-[#ffffff]"> is</span>
                  <br className="text-[#ffffff]" />
                  now effortless.
                </h1>
                <p className="text-[#3a3e46] max-w-xl">
                  Effortless coding assessment for instructors, instant feedback for students.
                </p>
                <div>
                  <button className="rounded-full bg-[#63c6d0] text-white px-6 py-3 text-base font-semibold shadow-sm hover:opacity-90 transition">
                    Join class
                  </button>
                </div>
              </div>

              <div className="relative">
                <div className="relative mx-auto max-w-lg">
                  <Image
                    src="https://png.pngtree.com/png-vector/20250121/ourmid/pngtree-a-cheerful-young-student-with-long-wavy-brown-hair-png-image_15291628.png"
                    alt="Hero Illustration"
                    width={700}
                    height={600}
                    className="rounded-[40%]"
                    priority
                    unoptimized
                  />

                  {/* Floating badges */}
                  <div className="absolute -top-4 left-0">
                    <div className="flex items-center gap-3 rounded-xl bg-white/95 px-4 py-3 shadow">
                      <div className="grid h-8 w-8 place-content-center rounded-md bg-[#d7effb] text-[#3a3e46]">📅</div>
                      <div className="text-sm">
                        <div className="font-semibold text-[#3a3e46]">250k</div>
                        <div className="text-gray-500 -mt-0.5">Assisted Student</div>
                      </div>
                    </div>
                  </div>

                  <div className="absolute top-1/3 -left-6">
                    <div className="grid h-10 w-10 place-content-center rounded-lg bg-[#ff7a7a] text-white shadow">📩</div>
                  </div>

                  <div className="absolute top-1/2 right-0 translate-x-8">
                    <div className="rounded-xl bg-white/95 px-4 py-3 shadow max-w-xs">
                      <div className="font-semibold text-[#3a3e46]">Congratulations</div>
                      <div className="text-gray-500 text-sm">Your admission completed</div>
                    </div>
                  </div>

                  <div className="absolute -bottom-6 left-10 right-10">
                    <div className="flex items-center gap-4 rounded-xl bg-white/95 px-4 py-3 shadow">
                      <div className="h-8 w-8 rounded-full bg-gray-300" />
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-[#3a3e46]">SangNM</div>
                        <div className="text-xs text-gray-500">Today at 12.00 PM</div>
                      </div>
                      <button className="rounded-full bg-[#ff5b8a] px-4 py-1.5 text-white text-sm font-semibold">Join Now</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Decorative bottom curve */}
          <div className="overflow-hidden">
            <svg viewBox="0 0 1440 120" className="w-full h-[120px] -mb-[1px]" preserveAspectRatio="none">
              <path d="M0,96L1440,32L1440,160L0,160Z" fill="#cde8fb" />
            </svg>
          </div>
        </div>
      </section>
    </Layout>
  );
}


