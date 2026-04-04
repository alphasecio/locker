"use client";

import { FolderSvg } from "../_components/folder-svg";
import { FadeIn } from "../_components/fade-in";

export function Product() {
  return (
    <section className="flex flex-col bg-mkt-dark">
      <div className="grid-layout w-full py-20">
        <FadeIn className="col-span-full text-center">
          <p className="mkt-label text-primary">Why self-host?</p>
          <h2 className="mkt-heading mt-2 text-white">
            Full control over your data
          </h2>
          <p className="mkt-body mx-auto mt-4 max-w-2xl text-balance text-white/60">
            No vendor lock-in, no surprise pricing, no third party reading your
            files. Deploy on your own servers and keep everything under your
            roof.
          </p>
        </FadeIn>

        {/* Highlight quote card */}
        <FadeIn className="col-span-full mt-10" delay={0.1}>
          <div className="relative overflow-hidden rounded-2xl bg-primary">
            <div className="relative flex flex-col justify-center p-8 lg:p-12">
              <blockquote className="mkt-heading text-white">
                We moved 4TB of team files off Google Drive in a weekend. Same
                S3 bucket we already had, fraction of the cost.&nbsp;
              </blockquote>
              <div className="mkt-subheading mt-6 text-white/90">
                Engineering Lead, 50-person startup
              </div>
              <div className="mkt-body-sm text-white/60">
                Self-hosting on AWS with S3 storage
              </div>
            </div>
          </div>
        </FadeIn>

        {/* Stats row */}
        <div className="col-span-full mt-10 grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { value: "100%", label: "Open source" },
            { value: "4", label: "Storage providers" },
            { value: "Type-safe", label: "End-to-end with tRPC" },
            { value: "0", label: "Vendor lock-in" },
          ].map((stat, i) => (
            <FadeIn
              key={stat.label}
              className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5 text-center"
              delay={0.15 + i * 0.06}
            >
              <div className="mkt-heading text-primary">{stat.value}</div>
              <div className="mkt-body-sm mt-1 text-white/50">{stat.label}</div>
            </FadeIn>
          ))}
        </div>
      </div>

      <div className="w-full">
        <div className="grid-layout relative">
          <div className="col-span-full flex justify-center">
            <FolderSvg className="text-muted" />
          </div>
        </div>
      </div>
    </section>
  );
}
