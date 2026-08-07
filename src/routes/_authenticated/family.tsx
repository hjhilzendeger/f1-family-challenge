import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2, Users, X } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { groupsQuery, profilesQuery, scoresQuery } from "@/lib/f1";
import { deleteFamilyGroup, removeFamilyMember } from "@/lib/members.functions";

export const Route = createFileRoute("/_authenticated/family")({
  head: () => ({
    meta: [
      { title: "Your family group — Friendly Family Competition" },
      {
        name: "description",
        content:
          "Choose or create your family group, set your nickname and see who you're racing against this season.",
      },
      { property: "og:title", content: "Your family group — Friendly Family Competition" },
      {
        property: "og:description",
        content: "Manage your family group and nickname for the F1 prediction game.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FamilyPage,
});

function FamilyPage() {
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const profiles = useQuery(profilesQuery);
  const groups = useQuery(groupsQuery);
  const scores = useQuery(scoresQuery);

  const me = profiles.data?.find((profile) => profile.id === user.id) ?? null;
  const [nickname, setNickname] = useState("");
  const [newGroup, setNewGroup] = useState("");
  const [pendingRemoval, setPendingRemoval] = useState<{ id: string; name: string } | null>(null);
  const [removing, setRemoving] = useState(false);
  const removeMember = useServerFn(removeFamilyMember);
  const deleteGroup = useServerFn(deleteFamilyGroup);
  const [confirmDeleteGroup, setConfirmDeleteGroup] = useState(false);
  const [deletingGroup, setDeletingGroup] = useState(false);

  const confirmRemoval = async () => {
    if (!pendingRemoval) return;
    setRemoving(true);
    try {
      const result = await removeMember({ data: { userId: pendingRemoval.id } });
      toast.success(`${result.removed} has left the game. 👋`);
      setPendingRemoval(null);
      await queryClient.invalidateQueries();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "That didn't work — try again?");
    } finally {
      setRemoving(false);
    }
  };

  const confirmGroupDeletion = async (groupId: string) => {
    setDeletingGroup(true);
    try {
      const result = await deleteGroup({ data: { groupId } });
      toast.success(`${result.name} has been deleted. Thanks for playing! 🏁`);
      await supabase.auth.signOut();
      window.location.href = "/";
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "That didn't work — try again?");
      setDeletingGroup(false);
    }
  };

  if (profiles.isLoading) {
    return (
      <AppShell>
        <Skeleton className="h-64 w-full rounded-3xl" />
      </AppShell>
    );
  }

  const members = (profiles.data ?? []).filter(
    (profile) => me?.group_id && profile.group_id === me.group_id,
  );
  const myGroup = (groups.data ?? []).find((group) => group.id === me?.group_id) ?? null;
  const iStartedGroup = myGroup?.created_by === user.id;

  const saveNickname = async () => {
    const { error } = await supabase
      .from("profiles")
      .update({ nickname: nickname.trim() || null })
      .eq("id", user.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Nickname updated! 😎");
    await queryClient.invalidateQueries();
  };

  const switchGroup = async (groupId: string) => {
    const { error } = await supabase.from("profiles").update({ group_id: groupId }).eq("id", user.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("You've joined the group! 🎉");
    await queryClient.invalidateQueries();
  };

  const createGroup = async () => {
    const { data, error } = await supabase
      .from("family_groups")
      .insert({ name: newGroup.trim(), created_by: user.id })
      .select("id")
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    setNewGroup("");
    await switchGroup(data.id);
  };

  return (
    <AppShell>
      <h1 className="text-4xl">Your family</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Anyone can join any group — perfect for guests who want to play along.
      </p>

      <section className="mt-6 rounded-3xl border border-border bg-card/70 p-5">
        <div className="flex items-center gap-2">
          <Users className="size-4 text-accent" aria-hidden="true" />
          <h2 className="text-2xl">{me?.group_id ? myGroup?.name ?? "Your group" : "No group yet"}</h2>
        </div>
        {members.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-2">
            {members.map((member) => {
              const total = (scores.data ?? [])
                .filter((score) => score.user_id === member.id)
                .reduce((sum, score) => sum + score.points, 0);
              const label = member.nickname || member.display_name;
              return (
                <li
                  key={member.id}
                  className="flex items-center gap-2 rounded-xl border border-border bg-secondary/40 px-3 py-2 text-sm"
                >
                  <span>
                    <span className="font-semibold">{label}</span>{" "}
                    <span className="tnum text-muted-foreground">{total} pts</span>
                  </span>
                  {iStartedGroup && member.id !== user.id && (
                    <button
                      type="button"
                      aria-label={`Remove ${label} from the game`}
                      title={`Remove ${label} from the game`}
                      className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-destructive/20 hover:text-foreground"
                      onClick={() => setPendingRemoval({ id: member.id, name: label })}
                    >
                      <X className="size-4" aria-hidden="true" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">Pick a group below to get started.</p>
        )}
        {iStartedGroup && members.length > 1 && (
          <p className="mt-3 text-xs text-muted-foreground">
            You started this group, so you can remove players with the ✕ button.
          </p>
        )}
      </section>

      <AlertDialog
        open={pendingRemoval !== null}
        onOpenChange={(open) => !open && setPendingRemoval(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {pendingRemoval?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This deletes their sign-in, all their picks and their points for good. They can always
              create a new name later if they want to play again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Keep them</AlertDialogCancel>
            <AlertDialogAction
              disabled={removing}
              onClick={(event) => {
                event.preventDefault();
                void confirmRemoval();
              }}
            >
              {removing ? "Removing…" : "Yes, remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


      {iStartedGroup && myGroup && (
        <section className="mt-6 rounded-3xl border border-destructive/40 bg-destructive/5 p-5">
          <div className="flex items-center gap-2">
            <Trash2 className="size-4 text-destructive" aria-hidden="true" />
            <h2 className="text-2xl">Delete this group</h2>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            You started {myGroup.name}, so you can wrap it up for good. This removes the group and
            every player in it — logins, picks and points included, yours too.
          </p>
          <Button
            variant="destructive"
            className="mt-4"
            onClick={() => setConfirmDeleteGroup(true)}
          >
            Delete {myGroup.name}
          </Button>
        </section>
      )}

      <AlertDialog
        open={confirmDeleteGroup}
        onOpenChange={(open) => !open && !deletingGroup && setConfirmDeleteGroup(false)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {myGroup?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              All {members.length} player{members.length === 1 ? "" : "s"} will lose their sign-in,
              picks and points, and you'll be signed out. Anyone can start a fresh group later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingGroup}>Keep the group</AlertDialogCancel>
            <AlertDialogAction
              disabled={deletingGroup}
              onClick={(event) => {
                event.preventDefault();
                if (myGroup) void confirmGroupDeletion(myGroup.id);
              }}
            >
              {deletingGroup ? "Deleting…" : "Yes, delete everything"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <section className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="rounded-3xl border border-border bg-card/70 p-5">
          <h2 className="text-2xl">Join a group</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {(groups.data ?? []).map((group) => (
              <Button
                key={group.id}
                variant={group.id === me?.group_id ? "default" : "secondary"}
                onClick={() => switchGroup(group.id)}
              >
                {group.name}
              </Button>
            ))}
            {(groups.data ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">No groups yet — create the first one.</p>
            )}
          </div>

          <div className="mt-5 space-y-2">
            <Label htmlFor="newGroup">Start a new group</Label>
            <div className="flex gap-2">
              <Input
                id="newGroup"
                value={newGroup}
                onChange={(event) => setNewGroup(event.target.value)}
                placeholder="The Hilzendegers"
              />
              <Button disabled={!newGroup.trim()} onClick={createGroup}>
                Create
              </Button>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card/70 p-5">
          <h2 className="text-2xl">Your nickname</h2>
          <p className="text-sm text-muted-foreground">
            Shown on the leaderboard instead of your name. Keep it friendly!
          </p>
          <div className="mt-3 space-y-2">
            <Label htmlFor="nickname">Nickname</Label>
            <div className="flex gap-2">
              <Input
                id="nickname"
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
                placeholder={me?.nickname ?? "Speedy Grandma"}
              />
              <Button onClick={saveNickname}>Save</Button>
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
