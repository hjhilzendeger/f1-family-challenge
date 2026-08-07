import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const removeSchema = z.object({ userId: z.string().uuid() });

/**
 * The person who started a family group can remove a player from it.
 * Removing a player deletes their login, picks, points and activity for good.
 */
export const removeFamilyMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => removeSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    if (data.userId === userId) {
      throw new Error("You can't remove yourself — ask another family member.");
    }

    const { data: target, error: targetError } = await supabase
      .from("profiles")
      .select("group_id, display_name, nickname")
      .eq("id", data.userId)
      .maybeSingle();

    if (targetError) throw new Error(targetError.message);
    if (!target?.group_id) throw new Error("That player isn't in a family group.");

    const { data: group, error: groupError } = await supabase
      .from("family_groups")
      .select("created_by")
      .eq("id", target.group_id)
      .maybeSingle();

    if (groupError) throw new Error(groupError.message);
    if (!group || group.created_by !== userId) {
      throw new Error("Only the person who started this group can remove players.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);

    return { removed: target.nickname || target.display_name };
  });

const groupSchema = z.object({ groupId: z.string().uuid() });

/**
 * The person who started a family group can delete the whole group.
 * This removes every player's login, picks, points and activity in that group
 * — including the starter's own account — and then the group itself.
 */
export const deleteFamilyGroup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => groupSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: group, error: groupError } = await supabase
      .from("family_groups")
      .select("id, name, created_by")
      .eq("id", data.groupId)
      .maybeSingle();

    if (groupError) throw new Error(groupError.message);
    if (!group) throw new Error("That group doesn't exist any more.");
    if (group.created_by !== userId) {
      throw new Error("Only the person who started this group can delete it.");
    }

    const { data: members, error: membersError } = await supabase
      .from("profiles")
      .select("id")
      .eq("group_id", data.groupId);
    if (membersError) throw new Error(membersError.message);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Clear group activity first so nothing references the group.
    const { error: activityError } = await supabaseAdmin
      .from("activity")
      .delete()
      .eq("group_id", data.groupId);
    if (activityError) throw new Error(activityError.message);

    // Delete everyone else, then the starter last (their session ends after this).
    const others = (members ?? []).map((m) => m.id).filter((id) => id !== userId);
    for (const id of others) {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
      if (error) throw new Error(error.message);
    }

    // The starter's profile still points at the group — detach it first.
    const { error: detachError } = await supabaseAdmin
      .from("profiles")
      .update({ group_id: null })
      .eq("group_id", data.groupId);
    if (detachError) throw new Error(detachError.message);

    const { error: deleteGroupError } = await supabaseAdmin
      .from("family_groups")
      .delete()
      .eq("id", data.groupId);
    if (deleteGroupError) throw new Error(deleteGroupError.message);

    const { error: selfError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (selfError) throw new Error(selfError.message);

    return { name: group.name, players: (members ?? []).length };
  });
