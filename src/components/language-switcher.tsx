import { Check, Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n, type Lang } from "@/lib/i18n";

const OPTIONS: { code: Lang; label: string }[] = [
  { code: "EN", label: "English" },
  { code: "TR", label: "Türkçe" },
  { code: "AR", label: "العربية" },
];

export function LanguageSwitcher() {
  const { lang, setLang } = useI18n();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="group inline-flex items-center gap-2 rounded-md border border-border bg-card/60 px-3 py-2 text-xs font-semibold tracking-wider text-foreground/90 transition-colors hover:border-primary/60 hover:text-primary focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
        aria-label="Select language"
      >
        <Globe className="h-3.5 w-3.5 text-primary" />
        <span>{lang}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="min-w-[10rem] border-border bg-card text-foreground"
      >
        {OPTIONS.map((o) => {
          const active = o.code === lang;
          return (
            <DropdownMenuItem
              key={o.code}
              onSelect={() => setLang(o.code)}
              className="flex cursor-pointer items-center justify-between gap-3 text-sm focus:bg-primary/15 focus:text-primary"
            >
              <span className="flex items-center gap-2">
                <span className="inline-flex h-5 w-7 items-center justify-center rounded-sm border border-border/70 bg-background/60 text-[10px] font-bold tracking-wider text-foreground/80">
                  {o.code}
                </span>
                <span>{o.label}</span>
              </span>
              {active && <Check className="h-3.5 w-3.5 text-primary" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
