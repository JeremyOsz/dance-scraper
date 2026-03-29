const LINKEDIN_URL = "https://www.linkedin.com/in/jeremy-osztreicher-72236a125/";
const INSTAGRAM_URL = "https://www.instagram.com/JeremyOsz/";

type SiteSocialLinksProps = {
  className?: string;
};

export function SiteSocialLinks({ className }: SiteSocialLinksProps) {
  return (
    <nav aria-label="Site maintainer social profiles" className={className}>
      <ul className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <li>
          <a
            href={LINKEDIN_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            LinkedIn
          </a>
        </li>
        <li>
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Instagram (@JeremyOsz)
          </a>
        </li>
      </ul>
    </nav>
  );
}
