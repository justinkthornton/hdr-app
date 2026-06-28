"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type ShootSummary = {
  id: string;
  name: string;
  clientName: string | null;
  propertyAddress: string | null;
  notes: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

type ShootResponse = {
  shoots: ShootSummary[];
};

const emptyForm = {
  name: "",
  clientName: "",
  propertyAddress: "",
  notes: "",
  tags: ""
};

function isSmokeOrTestShoot(shoot: ShootSummary): boolean {
  const searchableText = [
    shoot.name,
    shoot.clientName,
    shoot.propertyAddress,
    shoot.notes,
    ...shoot.tags
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return searchableText.includes("smoke") || searchableText.includes("test");
}

function sortShootsForReview(shoots: ShootSummary[]): ShootSummary[] {
  return [...shoots].sort((left, right) => {
    const leftIsTest = isSmokeOrTestShoot(left);
    const rightIsTest = isSmokeOrTestShoot(right);

    if (leftIsTest !== rightIsTest) {
      return leftIsTest ? 1 : -1;
    }

    return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
  });
}

export default function DashboardClient(): React.ReactElement {
  const [shoots, setShoots] = useState<ShootSummary[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  async function loadShoots(): Promise<void> {
    setIsLoading(true);
    const response = await fetch("/api/shoots");

    if (response.status === 401) {
      window.location.assign("/login");
      return;
    }

    if (!response.ok) {
      setError("Shoots could not be loaded.");
      setIsLoading(false);
      return;
    }

    const body = (await response.json()) as ShootResponse;
    setShoots(sortShootsForReview(body.shoots));
    setIsLoading(false);
  }

  useEffect(() => {
    void loadShoots();
  }, []);

  async function createShoot(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setIsSaving(true);

    const response = await fetch("/api/shoots", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        name: form.name,
        clientName: form.clientName,
        propertyAddress: form.propertyAddress,
        notes: form.notes,
        tags: form.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean)
      })
    });

    setIsSaving(false);

    if (!response.ok) {
      setError("Shoot could not be created.");
      return;
    }

    setForm(emptyForm);
    await loadShoots();
  }

  async function logout(): Promise<void> {
    await fetch("/api/admin/logout", {
      method: "POST"
    });
    window.location.assign("/login");
  }

  return (
    <>
      <header className="topbar">
        <div className="brand">
          <h1>Structure-Locked HDR</h1>
          <p>Phase 2A bracket upload review</p>
        </div>
        <button className="secondary" type="button" onClick={logout}>
          Sign out
        </button>
      </header>

      <section className="grid">
        <form className="panel form-grid" onSubmit={createShoot}>
          <h2>Create shoot</h2>
          <div className="form-row">
            <label htmlFor="name">Shoot name</label>
            <input
              id="name"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              required
            />
          </div>
          <div className="form-row">
            <label htmlFor="clientName">Client</label>
            <input
              id="clientName"
              value={form.clientName}
              onChange={(event) => setForm({ ...form, clientName: event.target.value })}
            />
          </div>
          <div className="form-row">
            <label htmlFor="propertyAddress">Property address</label>
            <input
              id="propertyAddress"
              value={form.propertyAddress}
              onChange={(event) => setForm({ ...form, propertyAddress: event.target.value })}
            />
          </div>
          <div className="form-row">
            <label htmlFor="tags">Tags</label>
            <input
              id="tags"
              value={form.tags}
              onChange={(event) => setForm({ ...form, tags: event.target.value })}
            />
          </div>
          <div className="form-row">
            <label htmlFor="notes">Notes</label>
            <textarea
              id="notes"
              value={form.notes}
              onChange={(event) => setForm({ ...form, notes: event.target.value })}
            />
          </div>
          {error ? <p className="error">{error}</p> : null}
          <button type="submit" disabled={isSaving}>
            {isSaving ? "Creating..." : "Create shoot"}
          </button>
        </form>

        <div className="panel">
          <div className="section-heading">
            <div>
              <h2>Shoots</h2>
              <p className="muted">
                Open a shoot to upload bracket photos and review detected groups.
              </p>
            </div>
          </div>
          {isLoading ? <p className="muted">Loading shoots...</p> : null}
          {!isLoading && shoots.length === 0 ? <p className="muted">No shoots yet.</p> : null}
          <div className="shoot-list">
            {shoots.map((shoot) => {
              const isTestShoot = isSmokeOrTestShoot(shoot);

              return (
                <article className="shoot-card" key={shoot.id}>
                  <div className="shoot-card-title">
                    <Link href={`/shoots/${shoot.id}`}>
                      <h3>{shoot.name}</h3>
                    </Link>
                    {isTestShoot ? <span className="tag warning-tag">Test/smoke</span> : null}
                  </div>
                  <p className="muted">
                    {[shoot.clientName, shoot.propertyAddress].filter(Boolean).join(" | ") ||
                      "No client or address yet"}
                  </p>
                  {shoot.tags.length > 0 ? (
                    <div className="tag-row">
                      {shoot.tags.map((tag) => (
                        <span className="tag" key={tag}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <Link className="button-link" href={`/shoots/${shoot.id}`}>
                    Open shoot
                  </Link>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
