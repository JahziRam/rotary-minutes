"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Plus, Trash2, Upload, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  createEmailContact,
  deleteEmailContact,
  importMembersAsContacts,
  importContactsCsv,
  createEmailGroup,
  deleteEmailGroup,
  setGroupContacts,
} from "@/actions/emails";

type Contact = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  tags: string[];
};

type Group = {
  id: string;
  name: string;
  description: string | null;
  _count: { contacts: number };
  contacts: { contact: Contact }[];
};

export function ContactsManager({
  contacts,
  groups,
  canSend,
}: {
  contacts: Contact[];
  groups: Group[];
  canSend: boolean;
}) {
  const t = useTranslations("emails");
  const tCommon = useTranslations("common");
  const [tab, setTab] = useState<"contacts" | "groups">("contacts");
  const [pending, startTransition] = useTransition();
  const [csv, setCsv] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [showGroup, setShowGroup] = useState(false);
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);

  if (!canSend) {
    return (
      <p className="text-sm text-gray-500">{t("noPermission")}</p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b border-gray-200">
        <button
          type="button"
          onClick={() => setTab("contacts")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab === "contacts" ? "border-navy text-navy" : "border-transparent text-gray-500"}`}
        >
          {t("contacts")} ({contacts.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("groups")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab === "groups" ? "border-navy text-navy" : "border-transparent text-gray-500"}`}
        >
          {t("groups")} ({groups.length})
        </button>
      </div>

      {tab === "contacts" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button variant="gold" size="sm" onClick={() => setShowAdd(true)}>
              <Plus className="h-4 w-4 mr-1" />
              {t("addContact")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => startTransition(() => { void importMembersAsContacts(); })}
            >
              <Users className="h-4 w-4 mr-1" />
              {t("importMembers")}
            </Button>
          </div>

          {showAdd && (
            <Card>
              <CardContent className="p-4">
                <form
                  action={(fd) => {
                    startTransition(async () => {
                      await createEmailContact({
                        email: fd.get("email") as string,
                        firstName: (fd.get("firstName") as string) || undefined,
                        lastName: (fd.get("lastName") as string) || undefined,
                        company: (fd.get("company") as string) || undefined,
                      });
                      setShowAdd(false);
                    });
                  }}
                  className="grid sm:grid-cols-2 gap-3"
                >
                  <Input name="email" type="email" label="Email" required />
                  <Input name="firstName" label={t("firstName")} />
                  <Input name="lastName" label={t("lastName")} />
                  <Input name="company" label={t("company")} />
                  <div className="sm:col-span-2 flex gap-2 justify-end">
                    <Button type="button" variant="outline" onClick={() => setShowAdd(false)}>
                      {tCommon("cancel")}
                    </Button>
                    <Button type="submit" variant="gold" disabled={pending}>
                      {tCommon("save")}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="text-sm font-medium text-gray-700">{t("importCsv")}</p>
              <textarea
                value={csv}
                onChange={(e) => setCsv(e.target.value)}
                placeholder="email, prénom, nom"
                className="w-full min-h-[80px] rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
              <Button
                variant="outline"
                size="sm"
                disabled={pending || !csv.trim()}
                onClick={() =>
                  startTransition(async () => {
                    await importContactsCsv(csv);
                    setCsv("");
                  })
                }
              >
                <Upload className="h-4 w-4 mr-1" />
                {t("importCsvBtn")}
              </Button>
            </CardContent>
          </Card>

          <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
            {contacts.length === 0 ? (
              <p className="p-4 text-sm text-gray-500">{tCommon("noResults")}</p>
            ) : (
              contacts.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-3 bg-white hover:bg-gray-50">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {[c.firstName, c.lastName].filter(Boolean).join(" ") || c.email}
                    </p>
                    <p className="text-xs text-gray-500">{c.email}</p>
                    {c.tags.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {c.tags.map((tag) => (
                          <Badge key={tag} variant="muted">{tag}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    className="text-gray-400 hover:text-red-600 p-1"
                    onClick={() => startTransition(() => { void deleteEmailContact(c.id); })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {tab === "groups" && (
        <div className="space-y-4">
          <Button variant="gold" size="sm" onClick={() => setShowGroup(true)}>
            <Plus className="h-4 w-4 mr-1" />
            {t("addGroup")}
          </Button>

          {showGroup && (
            <Card>
              <CardContent className="p-4">
                <form
                  action={(fd) => {
                    startTransition(async () => {
                      await createEmailGroup({
                        name: fd.get("name") as string,
                        description: (fd.get("description") as string) || undefined,
                      });
                      setShowGroup(false);
                    });
                  }}
                  className="space-y-3"
                >
                  <Input name="name" label={t("groupName")} required />
                  <Input name="description" label={t("groupDescription")} />
                  <div className="flex gap-2 justify-end">
                    <Button type="button" variant="outline" onClick={() => setShowGroup(false)}>
                      {tCommon("cancel")}
                    </Button>
                    <Button type="submit" variant="gold" disabled={pending}>
                      {tCommon("save")}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {groups.map((g) => (
            <Card key={g.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{g.name}</h3>
                    {g.description && <p className="text-sm text-gray-500">{g.description}</p>}
                    <p className="text-xs text-gray-400 mt-1">
                      {g._count.contacts} {t("contacts").toLowerCase()}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingGroup(g.id);
                        setSelectedContacts(g.contacts.map((c) => c.contact.id));
                      }}
                    >
                      {tCommon("edit")}
                    </Button>
                    <button
                      type="button"
                      className="text-gray-400 hover:text-red-600 p-2"
                      onClick={() => startTransition(() => { void deleteEmailGroup(g.id); })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {editingGroup === g.id && (
                  <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                    <p className="text-sm font-medium">{t("selectContacts")}</p>
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {contacts.map((c) => (
                        <label key={c.id} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={selectedContacts.includes(c.id)}
                            onChange={(e) => {
                              setSelectedContacts((prev) =>
                                e.target.checked
                                  ? [...prev, c.id]
                                  : prev.filter((id) => id !== c.id)
                              );
                            }}
                          />
                          {c.email}
                        </label>
                      ))}
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" size="sm" onClick={() => setEditingGroup(null)}>
                        {tCommon("cancel")}
                      </Button>
                      <Button
                        variant="gold"
                        size="sm"
                        disabled={pending}
                        onClick={() =>
                          startTransition(async () => {
                            await setGroupContacts(g.id, selectedContacts);
                            setEditingGroup(null);
                          })
                        }
                      >
                        {tCommon("save")}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}