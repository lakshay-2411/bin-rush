import { BinBuddy } from "./BinBuddy";

/** The three bin buddies standing together with a speech bubble above them. */
export function BuddiesCard({ message }: { message: string }) {
  return (
    <section className="flex flex-col gap-1.5 overflow-hidden rounded-[28px] bg-white px-4 pt-4 shadow-chunky">
      <p className="max-w-[270px] self-center rounded-2xl bg-ink px-3.5 py-2.5 text-center font-medium text-white">
        {message}
      </p>
      <div className="mt-1.5 flex items-end justify-center gap-1.5">
        <BinBuddy bin="wet" mood="happy" size={92} label="Wet bin buddy" />
        <BinBuddy bin="dry" mood="happy" size={106} label="Dry bin buddy" className="animate-wiggle" />
        <BinBuddy bin="hazardous" mood="worried" size={92} label="Hazardous bin buddy" />
      </div>
    </section>
  );
}
