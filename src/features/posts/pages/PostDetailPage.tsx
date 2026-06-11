import { ArrowLeft, Loader2 } from 'lucide-react';
import React, { useState } from 'react';
import type { LoaderFunctionArgs } from 'react-router';
import {
  isRouteErrorResponse,
  Link,
  useLoaderData,
  useNavigate,
  useRevalidator,
  useRouteError,
} from 'react-router';

import { Badge, Button } from '~/components/ui';
import {
  describeScheduledSendFailure,
  getPostStatusBadge,
  isAnnouncementDraftId,
  isConsentFormDraftId,
  isConsentFormId,
  postHref,
  validatePostRoute,
  type AnnouncementId,
  type ConsentFormId,
  type Post,
} from '~/data/posts-registry';
import {
  cancelAnnouncementSchedule,
  cancelConsentFormSchedule,
  deleteAnnouncement,
  deleteConsentForm,
  fetchSchoolStaff,
  fetchSession,
  getConfigs,
  rescheduleAnnouncementDraft,
  rescheduleConsentFormDraft,
  updateAnnouncementEnquiryEmail,
  updateAnnouncementStaffInCharge,
  updateConsentFormDueDate,
  updateConsentFormEnquiryEmail,
  updateConsentFormStaffInCharge,
} from '~/features/posts/api/client';
import { AppError, NotFoundError } from '~/features/posts/api/errors';
import type { ApiConfig, ApiSchoolStaff, ApiSession } from '~/features/posts/api/types';
import { DeletePostDialog } from '~/features/posts/components/DeletePostDialog';
import {
  PostCard,
  isoToSgtDate,
  type PostCardEditState,
} from '~/features/posts/components/PostCard';
import { SchedulePickerDialog } from '~/features/posts/components/SchedulePickerDialog';
import { formatDate, formatDateTime } from '~/helpers/dateTime';
import { notify } from '~/lib/notify';

interface PostDetailLoaderData {
  post: Post;
  configs: ApiConfig;
  staff: ApiSchoolStaff[];
  session: ApiSession;
}

// ─── Route loader ───────────────────────────────────────────────────────────

export async function loader({
  params,
  request,
}: LoaderFunctionArgs): Promise<PostDetailLoaderData> {
  const id = params.id;
  if (!id) throw new Response('Not Found', { status: 404 });

  const url = new URL(request.url);
  const parsed = validatePostRoute(id, url.searchParams.get('kind'));
  if (!parsed) throw new Response('Not Found', { status: 404 });

  // Drafts are only accessible via the edit route; a direct detail
  // request for any draft ID is treated as 404.
  if (isAnnouncementDraftId(parsed)) throw new Response('Not Found', { status: 404 });
  if (isConsentFormDraftId(parsed)) throw new Response('Not Found', { status: 404 });

  // Inline imports to avoid circular deps — client.ts provides the mapped loaders.
  const { loadConsentPostDetail, loadPostDetail } = await import('~/features/posts/api/client');

  const [post, configs, staff, session] = await Promise.all([
    isConsentFormId(parsed)
      ? loadConsentPostDetail(parsed)
      : loadPostDetail(parsed as AnnouncementId),
    getConfigs(),
    fetchSchoolStaff().catch(() => [] as ApiSchoolStaff[]),
    fetchSession(),
  ]);
  return { post, configs, staff, session };
}

// ─── Error boundary ─────────────────────────────────────────────────────────

export function ErrorBoundary() {
  const error = useRouteError();
  const navigate = useNavigate();
  const isNotFound =
    (isRouteErrorResponse(error) && error.status === 404) || error instanceof NotFoundError;

  return (
    <div className="flex flex-col items-center justify-center gap-4 px-6 py-16">
      <h2 className="text-xl font-semibold tracking-tight">
        {isNotFound ? 'Post not found' : 'Could not load post'}
      </h2>
      <p className="text-sm text-muted-foreground">
        {isNotFound
          ? 'This post may have been deleted.'
          : 'The server may be unavailable. Please try again.'}
      </p>
      <Button variant="secondary" size="sm" onClick={() => navigate(-1)}>
        Back to Posts
      </Button>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function extractDraftNumericId(id: string): number | null {
  const bare = id.startsWith('annDraft_')
    ? id.slice('annDraft_'.length)
    : id.startsWith('cfDraft_')
      ? id.slice('cfDraft_'.length)
      : id.startsWith('cf_')
        ? id.slice('cf_'.length)
        : id;
  const n = Number(bare);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function deleteMode(post: Post): 'posted' | 'draft' {
  if (post.kind === 'announcement') {
    return post.status === 'posted' || post.status === 'posting' ? 'posted' : 'draft';
  }
  return post.status === 'open' || post.status === 'closed' || post.status === 'posting'
    ? 'posted'
    : 'draft';
}

// ─── Detail header ───────────────────────────────────────────────────────────

interface DetailHeaderProps {
  post: Post;
  isEditing: boolean;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
}

function DetailHeader({ post, isEditing, saving, onSave, onCancel, onDelete }: DetailHeaderProps) {
  const badge = getPostStatusBadge(post);
  const iso = post.postedAt ?? post.createdAt;
  const postedDate = formatDateTime(iso) ?? formatDate(iso);
  const editHref = postHref(post, { edit: true });
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const canReschedule = post.status === 'scheduled';

  async function handleRescheduleConfirm(scheduledSendAt: string) {
    const draftId = extractDraftNumericId(post.id);
    if (draftId === null) {
      notify.error('Could not resolve the scheduled post id.');
      return;
    }
    setRescheduling(true);
    try {
      if (post.kind === 'form') {
        await rescheduleConsentFormDraft(draftId, { scheduledSendAt });
      } else {
        await rescheduleAnnouncementDraft(draftId, { scheduledSendAt });
      }
      notify.success('Post rescheduled.');
      setRescheduleOpen(false);
      revalidator.revalidate();
    } catch (err) {
      if (!(err instanceof AppError)) {
        notify.error('Failed to reschedule. Please try again.');
      }
    } finally {
      setRescheduling(false);
    }
  }

  async function handleCancelSchedule() {
    const draftId = extractDraftNumericId(post.id);
    if (draftId === null) {
      notify.error('Could not resolve the scheduled post id.');
      return;
    }
    const confirmed = window.confirm(
      'Cancel the scheduled send? The post will return to Draft so you can edit or reschedule it.',
    );
    if (!confirmed) return;
    setCancelling(true);
    try {
      if (post.kind === 'form') {
        await cancelConsentFormSchedule(draftId);
      } else {
        await cancelAnnouncementSchedule(draftId);
      }
      notify.success('Scheduled send cancelled.');
      revalidator.revalidate();
    } catch (err) {
      if (!(err instanceof AppError)) {
        notify.error('Failed to cancel the scheduled send.');
      }
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Back to Posts"
          className="mt-1"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{post.title}</h1>
            <Badge variant={badge.variant}>{badge.label}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Posted {postedDate}
            {post.createdBy ? ` · ${post.createdBy}` : ''}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {canReschedule && !isEditing && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancelSchedule}
              disabled={cancelling || rescheduling}
            >
              Cancel schedule
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setRescheduleOpen(true)}
              disabled={cancelling || rescheduling}
            >
              Reschedule
            </Button>
          </>
        )}

        {isEditing ? (
          <>
            <Button variant="ghost" size="sm" onClick={onCancel} disabled={saving}>
              Cancel
            </Button>
            <Button variant="secondary" size="sm" onClick={onSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Saving…
                </>
              ) : (
                'Save changes'
              )}
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={onDelete}
            >
              Delete
            </Button>
            <Button
              variant="secondary"
              size="sm"
              render={<Link to={editHref} />}
              nativeButton={false}
            >
              Edit
            </Button>
          </>
        )}
      </div>

      {canReschedule && (
        <SchedulePickerDialog
          open={rescheduleOpen}
          onOpenChange={setRescheduleOpen}
          onConfirm={handleRescheduleConfirm}
          busy={rescheduling}
        />
      )}
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

const PostDetailPage: React.FC = () => {
  const { post, staff, session } = useLoaderData<PostDetailLoaderData>();
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const failureReason = describeScheduledSendFailure(post.scheduledSendFailureCode);

  // ── Inline edit state ──────────────────────────────────────────────────────
  const [isEditing, setIsEditing] = useState(false);
  const [editState, setEditState] = useState<PostCardEditState>(() => ({
    enquiryEmail: post.enquiryEmail ?? '',
    staffOwnerIds: post.staffOwnerIds ?? [],
  }));
  const [saving, setSaving] = useState(false);

  function handleCancel() {
    setIsEditing(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (post.kind === 'announcement') {
        const id = post.id as AnnouncementId;
        await Promise.all([
          updateAnnouncementEnquiryEmail(id, { enquiryEmailAddress: editState.enquiryEmail }),
          updateAnnouncementStaffInCharge(id, editState.staffOwnerIds),
        ]);
      } else {
        const id = post.id as ConsentFormId;
        const numericId = Number(id.slice('cf_'.length));
        const initialDate = isoToSgtDate(post.consentByDate);
        const calls: Promise<unknown>[] = [
          updateConsentFormEnquiryEmail(id, { enquiryEmailAddress: editState.enquiryEmail }),
          updateConsentFormStaffInCharge(id, editState.staffOwnerIds),
        ];
        if (editState.consentByDate && editState.consentByDate !== initialDate) {
          calls.push(
            updateConsentFormDueDate(numericId, {
              consentByDate: `${editState.consentByDate}T23:59:59+08:00`,
            }),
          );
        }
        await Promise.all(calls);
      }
      notify.success('Changes saved.');
      setIsEditing(false);
      revalidator.revalidate();
    } catch {
      notify.error('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  // ── Delete state ───────────────────────────────────────────────────────────
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDeleteConfirm() {
    setDeleting(true);
    try {
      if (post.kind === 'announcement') {
        await deleteAnnouncement(post.id as AnnouncementId);
      } else {
        await deleteConsentForm(post.id as ConsentFormId);
      }
      notify.success('Post deleted.');
      void navigate('/posts');
    } catch {
      notify.error('Failed to delete. Please try again.');
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  }

  // ── Email options from session ─────────────────────────────────────────────
  const emailOptions = [session.staffEmailAdd, session.schoolEmailAddress].filter(
    (e): e is string => Boolean(e),
  );

  function handleEditStateChange(patch: Partial<PostCardEditState>) {
    setEditState((prev) => ({ ...prev, ...patch }));
  }

  const attachments = (post.attachments ?? []).map((a) => ({
    name: a.name,
    sizeKb: a.size / 1024,
  }));

  return (
    <div className="space-y-6 px-6 py-6">
      <DetailHeader
        post={post}
        isEditing={isEditing}
        saving={saving}
        onSave={handleSave}
        onCancel={handleCancel}
        onDelete={() => setDeleteOpen(true)}
      />

      {failureReason && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          <span className="font-medium">This post wasn&rsquo;t sent.</span> {failureReason} Pick a
          new time to try again, or cancel to return it to drafts.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content area — placeholder for detail stats/table components */}
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-lg border bg-background p-6">
            <p className="text-sm text-muted-foreground">
              {post.description || 'No description provided.'}
            </p>
          </div>
        </div>

        {/* Post card sidebar */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <PostCard
            post={post}
            attachments={attachments}
            isEditing={isEditing}
            editState={editState}
            onEditStateChange={handleEditStateChange}
            staffList={staff}
            emailOptions={emailOptions}
          />
        </div>
      </div>

      <DeletePostDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        mode={deleteMode(post)}
        title={post.title}
        onConfirm={handleDeleteConfirm}
        pending={deleting}
      />
    </div>
  );
};

export { PostDetailPage };
