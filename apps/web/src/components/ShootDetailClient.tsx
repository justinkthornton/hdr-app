"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type ShootDetail = {
  id: string;
  name: string;
  clientName: string | null;
  propertyAddress: string | null;
  notes: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

export default function ShootDetailClient({ shootId }: { shootId: string }): React.ReactElement {
  const [shoot, setShoot] = useState<ShootDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadShoot(): Promise<void> {
      const response = await fetch(`/api/shoots/${shootId}`);

      if (response.status === 401) {
        window.location.assign("/login");
        return;
      }

      if (!response.ok) {
        setError("Shoot could not be loaded.");
        return;
      }

      const body = (await response.json()) as { shoot: ShootDetail };
      setShoot(body.shoot);
    }

    void loadShoot();
  }, [shootId]);

  return (
    <>
      <header className="topbar">
        <div className="brand">
          <h1>{shoot?.name ?? "Shoot detail"}</h1>
          <p>Review shell</p>
        </div>
        <Link href="/dashboard">
          <button className="secondary" type="button">
            Back
          </button>
        </Link>
      </header>

      <section className="panel">
        {error ? <p className="error">{error}</p> : null}
        {!shoot && !error ? <p className="muted">Loading shoot...</p> : null}
        {shoot ? (
          <>
            <p className="muted">
              {[shoot.clientName, shoot.propertyAddress].filter(Boolean).join(" | ") ||
                "Client and property address are not set."}
            </p>
            {shoot.notes ? <p>{shoot.notes}</p> : null}
            {shoot.tags.length > 0 ? (
              <div className="tag-row">
                {shoot.tags.map((tag) => (
                  <span className="tag" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </>
        ) : null}
        <ul className="placeholder-list">
          <li>Phase 2 will add batch upload.</li>
          <li>Phase 2 will add EXIF grouping.</li>
          <li>Phase 2 will add bracket review.</li>
          <li>Phase 2 will add PhotomatixCL jobs.</li>
          <li>Phase 2 will add exports.</li>
        </ul>
      </section>
    </>
  );
}
