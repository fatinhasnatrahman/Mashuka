import { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Trash2,
  Check,
  Copy,
  Download,
  Key,
  KeyRound,
  Lock,
  Shield,
  Mail,
  FileJson,
  FileSpreadsheet,
} from 'lucide-react';
import type { CmsSettings, RbacRole, RbacUser } from '../../types.ts';
import type { AdminContextHelpers } from './types.ts';
import { formatDateTime } from '../../utils/format.ts';
import { DataTable } from './ui/DataTable.tsx';
import { Modal } from './ui/Modal.tsx';

const ROLES: RbacRole[] = [
  'Super Admin',
  'Shop Manager',
  'Content Editor',
  'Author',
  'Customer Support',
];

const RBAC_MATRIX: Array<{ capability: string; allowed: RbacRole[] }> = [
  { capability: 'Manage Products, SKUs & Pricing', allowed: ['Super Admin', 'Shop Manager'] },
  { capability: 'Process Orders & Refunds', allowed: ['Super Admin', 'Shop Manager', 'Customer Support'] },
  { capability: 'Publish & Edit Blog Posts', allowed: ['Super Admin', 'Content Editor', 'Author'] },
  { capability: 'Create Pages, Menus & SEO Redirects', allowed: ['Super Admin', 'Content Editor'] },
  { capability: 'Configure Appearance & Plugins', allowed: ['Super Admin'] },
  { capability: 'Manage RBAC Users, SMTP & API Keys', allowed: ['Super Admin'] },
];

// ==========================================
// 1. USERS & RBAC PERMISSION MATRIX VIEW
// ==========================================

export function UsersRbacView({ ctx }: { ctx: AdminContextHelpers }) {
  const { data, currentUser, authHeaders, reload, toast, navigate } = ctx;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<RbacRole>('Content Editor');
  const [initialPassword, setInitialPassword] = useState('');
  const [passwordTarget, setPasswordTarget] = useState<RbacUser | null>(null);
  const [resetPasswordVal, setResetPasswordVal] = useState('');
  const [savingPw, setSavingPw] = useState(false);

  const handleInvite = async () => {
    if (!name.trim() || !email.trim()) {
      toast('Enter team member name and email.', 'error');
      return;
    }
    if (initialPassword.trim() && initialPassword.trim().length < 6) {
      toast('Initial password must be at least 6 characters.', 'error');
      return;
    }
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({
        name: name.trim(),
        email: email.trim(),
        role,
        password: initialPassword.trim() || undefined,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      toast(json.error || 'Invite failed', 'error');
      return;
    }
    setName('');
    setEmail('');
    setInitialPassword('');
    toast(
      initialPassword.trim()
        ? `Added ${name} (${role}) with active dashboard login.`
        : `Invited ${name} as ${role}.`
    );
    await reload();
  };

  const handleResetUserPassword = async () => {
    if (!passwordTarget) return;
    if (resetPasswordVal.trim().length < 6) {
      toast('Password must be at least 6 characters.', 'error');
      return;
    }
    setSavingPw(true);
    try {
      const res = await fetch(`/api/admin/users/${passwordTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ password: resetPasswordVal.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update password');
      toast(`Login password updated for ${passwordTarget.name}.`);
      setPasswordTarget(null);
      setResetPasswordVal('');
      await reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Password update failed', 'error');
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-[#111315] dark:text-white">
            Users &amp; Role-Based Access Control (RBAC)
          </h1>
          <p className="text-xs text-[#525866] dark:text-[#9CA3AF]">
            Add team members with email/password logins and manage permissions across Mashuka CMS.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('settings')}
          className="h-9 px-3.5 rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#14171F] text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-[#F3F4F6] dark:hover:bg-[#1F2430]"
        >
          <KeyRound className="w-3.5 h-3.5 text-[#2563EB]" />
          <span>Change {currentUser.role} Password</span>
        </button>
      </div>

      {/* Add / Invite User Bar */}
      <div className="p-4 rounded-xl border border-[#E4E6EB] dark:border-[#252A36] bg-white dark:bg-[#14171F] flex flex-wrap items-end gap-3 text-xs">
        <label className="flex-1 min-w-[150px] space-y-1">
          <span className="font-medium">Full Name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Ayesha Rahman"
            className="w-full h-9 px-3 rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#0E1117]"
          />
        </label>
        <label className="flex-1 min-w-[180px] space-y-1">
          <span className="font-medium">Work Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ayesha@mashuka.com"
            className="w-full h-9 px-3 rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#0E1117]"
          />
        </label>
        <label className="w-44 space-y-1">
          <span className="font-medium">Role</span>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as RbacRole)}
            className="w-full h-9 px-2.5 rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#0E1117]"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <label className="flex-1 min-w-[160px] space-y-1">
          <span className="font-medium">Login Password (optional)</span>
          <input
            type="password"
            value={initialPassword}
            onChange={(e) => setInitialPassword(e.target.value)}
            placeholder="Min 6 chars to activate"
            className="w-full h-9 px-3 rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#0E1117]"
          />
        </label>
        <button
          type="button"
          onClick={handleInvite}
          className="h-9 px-4 rounded-lg bg-[#111315] dark:bg-[#2563EB] text-white font-semibold inline-flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Team User</span>
        </button>
      </div>

      {/* Team Directory */}
      <DataTable
        rows={data.users}
        getRowId={(u) => u.id}
        columns={[
          {
            key: 'name',
            header: 'Team Member',
            sortValue: (u) => u.name,
            render: (u) => (
              <div>
                <div className="font-semibold text-[#111315] dark:text-white flex items-center gap-2">
                  <span>{u.name}</span>
                  {u.has_password ? (
                    <span className="px-1.5 py-0.5 rounded bg-[#DBEAFE] text-[#1E40AF] dark:bg-[#1E3A8A]/40 dark:text-[#93C5FD] text-[10px] font-medium">
                      Login Ready
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded bg-[#F3F4F6] text-[#6B7280] dark:bg-[#27272A] dark:text-[#9CA3AF] text-[10px]">
                      No Password
                    </span>
                  )}
                </div>
                <div className="text-[11px] font-mono text-[#6B7280] dark:text-[#9CA3AF]">
                  {u.email}
                </div>
              </div>
            ),
          },
          {
            key: 'role',
            header: 'Assigned Role',
            render: (u) => (
              <select
                value={u.role}
                onChange={async (e) => {
                  const res = await fetch(`/api/admin/users/${u.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', ...authHeaders() },
                    body: JSON.stringify({ role: e.target.value as RbacRole }),
                  });
                  if (res.ok) {
                    toast(`Updated ${u.name} role.`);
                    await reload();
                  } else {
                    const err = await res.json();
                    toast(err.error || 'Could not update role', 'error');
                  }
                }}
                className="h-8 px-2.5 rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#0E1117] text-xs"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            ),
          },
          {
            key: 'status',
            header: 'Status',
            render: (u) => (
              <button
                type="button"
                onClick={async () => {
                  await fetch(`/api/admin/users/${u.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', ...authHeaders() },
                    body: JSON.stringify({ status: u.status === 'active' ? 'invited' : 'active' }),
                  });
                  await reload();
                }}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold capitalize ${
                  u.status === 'active'
                    ? 'bg-[#DCFCE7] text-[#166534] dark:bg-[#14532D]/50 dark:text-[#86EFAC]'
                    : 'bg-[#FEF3C7] text-[#92400E] dark:bg-[#451A03]/50 dark:text-[#FCD34D]'
                }`}
              >
                {u.status}
              </button>
            ),
          },
          {
            key: 'last',
            header: 'Last Active',
            align: 'right',
            render: (u) => (
              <span className="font-mono text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">
                {formatDateTime(u.last_active)}
              </span>
            ),
          },
          {
            key: 'actions',
            header: 'Security',
            align: 'right',
            render: (u) => (
              <div className="inline-flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setPasswordTarget(u);
                    setResetPasswordVal('');
                  }}
                  title="Set or reset user password"
                  className="h-7 px-2 rounded border border-[#E4E6EB] dark:border-[#2C3344] text-[11px] font-medium inline-flex items-center gap-1 hover:bg-[#F3F4F6] dark:hover:bg-[#1F2430]"
                >
                  <KeyRound className="w-3 h-3" />
                  <span>Password</span>
                </button>
                <button
                  type="button"
                  disabled={
                    u.role === 'Super Admin' &&
                    data.users.filter((x) => x.role === 'Super Admin').length <= 1
                  }
                  onClick={async () => {
                    const res = await fetch(`/api/admin/users/${u.id}`, {
                      method: 'DELETE',
                      headers: authHeaders(),
                    });
                    if (!res.ok) {
                      const err = await res.json();
                      toast(err.error || 'Cannot delete user', 'error');
                      return;
                    }
                    toast('Team member removed.');
                    await reload();
                  }}
                  className="p-1.5 text-[#DC2626] disabled:opacity-35"
                  title="Delete user"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ),
          },
        ]}
      />

      {/* Permission Matrix */}
      <div className="rounded-xl border border-[#E4E6EB] dark:border-[#252A36] bg-white dark:bg-[#14171F] overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#E4E6EB] dark:border-[#252A36] flex items-center gap-2 text-sm font-bold">
          <Shield className="w-4 h-4 text-[#2563EB]" />
          <span>Role Permission Matrix</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E4E6EB] dark:border-[#252A36] bg-[#F9FAFB] dark:bg-[#10131A] text-left">
                <th className="px-4 py-2.5 font-semibold">Module Capability</th>
                {ROLES.map((r) => (
                  <th key={r} className="px-4 py-2.5 text-center font-semibold whitespace-nowrap">
                    {r}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E6EB] dark:divide-[#252A36]">
              {RBAC_MATRIX.map((row) => (
                <tr key={row.capability}>
                  <td className="px-4 py-2.5 font-medium">{row.capability}</td>
                  {ROLES.map((r) => (
                    <td key={r} className="px-4 py-2.5 text-center">
                      {row.allowed.includes(r) ? (
                        <Check className="w-4 h-4 text-[#16A34A] mx-auto" />
                      ) : (
                        <span className="text-[#9CA3AF]">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Set / Reset User Password Modal */}
      <Modal
        open={Boolean(passwordTarget)}
        onClose={() => setPasswordTarget(null)}
        title={passwordTarget ? `Set Password — ${passwordTarget.name}` : 'Set Password'}
        size="sm"
        footer={
          passwordTarget && (
            <>
              <button
                type="button"
                onClick={() => setPasswordTarget(null)}
                className="h-9 px-4 rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingPw}
                onClick={handleResetUserPassword}
                className="h-9 px-4 rounded-lg bg-[#111315] dark:bg-[#2563EB] text-white text-xs font-semibold"
              >
                {savingPw ? 'Saving...' : 'Save Login Password'}
              </button>
            </>
          )
        }
      >
        {passwordTarget && (
          <div className="space-y-3 text-xs">
            <p className="text-[#525866] dark:text-[#9CA3AF]">
              Set a dashboard password for{' '}
              <span className="font-mono font-semibold text-[#111315] dark:text-white">
                {passwordTarget.email}
              </span>{' '}
              ({passwordTarget.role}). They can sign in using their Work Email and this password.
            </p>
            <label className="block space-y-1">
              <span className="font-medium">New Password (min 6 characters)</span>
              <input
                type="password"
                value={resetPasswordVal}
                onChange={(e) => setResetPasswordVal(e.target.value)}
                placeholder="Enter new password"
                className="w-full h-9 px-3 rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#0E1117]"
              />
            </label>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ==========================================
// 2. GENERAL SETTINGS, SMTP & API KEYS VIEW
// ==========================================

export function GeneralSettingsView({ ctx }: { ctx: AdminContextHelpers }) {
  const { data, currentUser, authHeaders, reload, notifyStoreChanged, toast } = ctx;
  const [draft, setDraft] = useState<CmsSettings>(data.cms);
  const [saving, setSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMessage, setPwMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(
    null
  );

  const [keyName, setKeyName] = useState('');
  const [keyPerms, setKeyPerms] = useState('catalog:read, orders:read, webhooks:write');
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);

  useEffect(() => {
    setDraft(data.cms);
  }, [data.cms]);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/cms', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          cms: draft,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to save settings');
      toast('General and SMTP settings saved.');
      await reload();
      notifyStoreChanged();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMessage(null);
    if (!currentPassword) {
      setPwMessage({ type: 'error', text: 'Enter your current password to verify.' });
      return;
    }
    if (newPassword.length < 6) {
      setPwMessage({ type: 'error', text: 'New password must be at least 6 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwMessage({ type: 'error', text: 'New password and confirmation do not match.' });
      return;
    }

    setPwSaving(true);
    try {
      const res = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setPwMessage({ type: 'error', text: json.error || 'Could not update password.' });
        return;
      }
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPwMessage({ type: 'success', text: json.message || 'Password updated successfully.' });
      toast('Account password updated securely.');
      await reload();
    } catch {
      setPwMessage({ type: 'error', text: 'Network error while updating password.' });
    } finally {
      setPwSaving(false);
    }
  };

  const handleGenerateKey = async () => {
    if (!keyName.trim()) {
      toast('Enter an API key label.', 'error');
      return;
    }
    const res = await fetch('/api/admin/api-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ name: keyName, permissions: keyPerms }),
    });
    const json = await res.json();
    if (!res.ok) {
      toast(json.error || 'Key creation failed', 'error');
      return;
    }
    setKeyName('');
    setRevealedSecret(json.secret);
    toast('API Key generated.');
    await reload();
  };

  return (
    <div className="space-y-6 max-w-5xl text-xs">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-[#111315] dark:text-white">
            General, Security &amp; Developer API Settings
          </h1>
          <p className="text-xs text-[#525866] dark:text-[#9CA3AF]">
            Configure timezone, maintenance mode, Super Admin password, SMTP templates, and API tokens.
          </p>
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={handleSaveSettings}
          className="h-9 px-5 rounded-lg bg-[#111315] dark:bg-[#2563EB] text-white font-semibold"
        >
          {saving ? 'Saving...' : 'Save All Settings'}
        </button>
      </div>

      {/* Dedicated Super Admin / Active Account Password Card */}
      <form
        onSubmit={handleChangePassword}
        className="p-5 rounded-xl border border-[#E4E6EB] dark:border-[#252A36] bg-white dark:bg-[#14171F] space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-bold text-sm">
            <Lock className="w-4 h-4 text-[#2563EB]" />
            <span>Change {currentUser.role} Password ({currentUser.email})</span>
          </div>
          <span className="text-[11px] font-mono text-[#6B7280] dark:text-[#9CA3AF]">
            Signed in as {currentUser.name}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <label className="block space-y-1">
            <span className="font-medium">Current Password</span>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              className="w-full h-9 px-3 rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#0E1117]"
            />
          </label>
          <label className="block space-y-1">
            <span className="font-medium">New Password</span>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min 6 characters"
              className="w-full h-9 px-3 rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#0E1117]"
            />
          </label>
          <label className="block space-y-1">
            <span className="font-medium">Confirm New Password</span>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              className="w-full h-9 px-3 rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#0E1117]"
            />
          </label>
          <button
            type="submit"
            disabled={pwSaving}
            className="h-9 px-4 rounded-lg bg-[#111315] dark:bg-[#2563EB] text-white font-semibold disabled:opacity-50"
          >
            {pwSaving ? 'Updating...' : 'Update Password'}
          </button>
        </div>

        {pwMessage && (
          <div
            className={`p-2.5 rounded-lg border text-xs ${
              pwMessage.type === 'error'
                ? 'bg-[#FEF2F2] border-[#FECACA] text-[#DC2626] dark:bg-[#2A1519] dark:border-[#7F1D1D] dark:text-[#FCA5A5]'
                : 'bg-[#F0FDF4] border-[#BBF7D0] text-[#166534] dark:bg-[#14532D]/40 dark:border-[#166534] dark:text-[#86EFAC]'
            }`}
          >
            {pwMessage.text}
          </div>
        )}
      </form>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* General Site Identity */}
        <div className="p-5 rounded-xl border border-[#E4E6EB] dark:border-[#252A36] bg-white dark:bg-[#14171F] space-y-4">
          <div className="font-bold text-sm">Site Identity &amp; Store Status</div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="font-medium">Currency Symbol</span>
              <input
                type="text"
                value={draft.currency_symbol}
                onChange={(e) => setDraft({ ...draft, currency_symbol: e.target.value })}
                className="w-full h-9 px-3 font-mono rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#0E1117]"
              />
            </label>
            <label className="block space-y-1">
              <span className="font-medium">Timezone</span>
              <input
                type="text"
                value={draft.timezone}
                onChange={(e) => setDraft({ ...draft, timezone: e.target.value })}
                className="w-full h-9 px-3 font-mono rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#0E1117]"
              />
            </label>
            <label className="block space-y-1">
              <span className="font-medium">Support Email</span>
              <input
                type="email"
                value={draft.support_email}
                onChange={(e) => setDraft({ ...draft, support_email: e.target.value })}
                className="w-full h-9 px-3 rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#0E1117]"
              />
            </label>
            <label className="block space-y-1">
              <span className="font-medium">Support WhatsApp</span>
              <input
                type="text"
                value={draft.support_whatsapp}
                onChange={(e) => setDraft({ ...draft, support_whatsapp: e.target.value })}
                className="w-full h-9 px-3 font-mono rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#0E1117]"
              />
            </label>
          </div>
          <label className="block space-y-1">
            <span className="font-medium">Store Physical Address</span>
            <input
              type="text"
              value={draft.store_address}
              onChange={(e) => setDraft({ ...draft, store_address: e.target.value })}
              className="w-full h-9 px-3 rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#0E1117]"
            />
          </label>
          <label className="flex items-center justify-between p-3 rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] cursor-pointer">
            <div>
              <div className="font-semibold">Maintenance Mode</div>
              <div className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">
                Show temporary storefront notice while updating catalog
              </div>
            </div>
            <input
              type="checkbox"
              checked={draft.maintenance_mode}
              onChange={(e) => setDraft({ ...draft, maintenance_mode: e.target.checked })}
            />
          </label>
        </div>

        {/* SMTP & Notification Templates */}
        <div className="p-5 rounded-xl border border-[#E4E6EB] dark:border-[#252A36] bg-white dark:bg-[#14171F] space-y-4">
          <div className="font-bold text-sm flex items-center gap-2">
            <Mail className="w-4 h-4 text-[#2563EB]" />
            <span>SMTP &amp; Notification Templates</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="font-medium">SMTP Host</span>
              <input
                type="text"
                value={draft.smtp_host}
                onChange={(e) => setDraft({ ...draft, smtp_host: e.target.value })}
                className="w-full h-9 px-3 font-mono rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#0E1117]"
              />
            </label>
            <label className="block space-y-1">
              <span className="font-medium">Sender From Address</span>
              <input
                type="text"
                value={draft.smtp_from}
                onChange={(e) => setDraft({ ...draft, smtp_from: e.target.value })}
                className="w-full h-9 px-3 rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#0E1117]"
              />
            </label>
          </div>
          <div className="space-y-3">
            {draft.smtp_templates.map((tpl, idx) => (
              <div
                key={tpl.id}
                className="p-3 rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-[#F9FAFB] dark:bg-[#0E1117] space-y-2"
              >
                <div className="font-semibold">{tpl.name}</div>
                <input
                  type="text"
                  value={tpl.subject}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      smtp_templates: draft.smtp_templates.map((t, i) =>
                        i === idx ? { ...t, subject: e.target.value } : t
                      ),
                    })
                  }
                  className="w-full h-8 px-2.5 rounded border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#14171F]"
                />
                <textarea
                  rows={2}
                  value={tpl.body}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      smtp_templates: draft.smtp_templates.map((t, i) =>
                        i === idx ? { ...t, body: e.target.value } : t
                      ),
                    })
                  }
                  className="w-full p-2 rounded border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#14171F]"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* API Keys & Webhooks */}
      <div className="p-5 rounded-xl border border-[#E4E6EB] dark:border-[#252A36] bg-white dark:bg-[#14171F] space-y-4">
        <div className="font-bold text-sm flex items-center gap-2">
          <Key className="w-4 h-4 text-[#2563EB]" />
          <span>REST API Keys &amp; Courier Webhooks</span>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <label className="flex-1 min-w-[180px] space-y-1">
            <span className="font-medium">Integration Name</span>
            <input
              type="text"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              placeholder="e.g. Steadfast Courier Sync"
              className="w-full h-9 px-3 rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#0E1117]"
            />
          </label>
          <label className="flex-1 min-w-[220px] space-y-1">
            <span className="font-medium">Scopes</span>
            <input
              type="text"
              value={keyPerms}
              onChange={(e) => setKeyPerms(e.target.value)}
              className="w-full h-9 px-3 font-mono rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#0E1117]"
            />
          </label>
          <button
            type="button"
            onClick={handleGenerateKey}
            className="h-9 px-4 rounded-lg bg-[#111315] dark:bg-[#2563EB] text-white font-semibold"
          >
            Generate Key
          </button>
        </div>

        {revealedSecret && (
          <div className="p-3 rounded-lg bg-[#DCFCE7] dark:bg-[#14532D]/40 border border-[#BBF7D0] dark:border-[#166534] flex items-center justify-between gap-3">
            <div>
              <div className="font-bold text-[#166534] dark:text-[#86EFAC]">
                Copy your new API secret now — it will not be shown again:
              </div>
              <div className="font-mono mt-0.5 text-[#111315] dark:text-white">{revealedSecret}</div>
            </div>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(revealedSecret);
                toast('Secret copied to clipboard.');
              }}
              className="h-8 px-3 rounded bg-white dark:bg-[#14171F] border border-[#BBF7D0] inline-flex items-center gap-1 font-medium"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </button>
          </div>
        )}

        <div className="divide-y divide-[#E4E6EB] dark:divide-[#252A36]">
          {data.apiKeys.map((k) => (
            <div key={k.id} className="py-2.5 flex items-center justify-between gap-3">
              <div>
                <div className="font-semibold text-[#111315] dark:text-white">{k.name}</div>
                <div className="text-[11px] font-mono text-[#6B7280] dark:text-[#9CA3AF]">
                  {k.key_preview} · {k.permissions}
                </div>
              </div>
              <button
                type="button"
                onClick={async () => {
                  await fetch(`/api/admin/api-keys/${k.id}`, {
                    method: 'DELETE',
                    headers: authHeaders(),
                  });
                  toast('API Key revoked.');
                  await reload();
                }}
                className="px-2.5 py-1 rounded border border-[#FECACA] text-[#DC2626] hover:bg-[#FEF2F2] dark:hover:bg-[#2A1519]"
              >
                Revoke
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 3. AUDIT LOGS & EXPORT CENTER VIEW
// ==========================================

export function AuditAndExportView({ ctx }: { ctx: AdminContextHelpers }) {
  const { data, authHeaders, toast } = ctx;
  const [search, setSearch] = useState('');

  const filteredLogs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.auditLogs.filter(
      (l) =>
        !q ||
        l.actor_name.toLowerCase().includes(q) ||
        l.action.toLowerCase().includes(q) ||
        l.target.toLowerCase().includes(q) ||
        l.details.toLowerCase().includes(q)
    );
  }, [data.auditLogs, search]);

  const downloadCsv = (filename: string, headers: string[], rows: Array<Array<string | number>>) => {
    const csv = [
      headers.join(','),
      ...rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast(`Downloaded ${filename}`);
  };

  const downloadFullJson = async () => {
    const res = await fetch('/api/admin/export', { headers: authHeaders() });
    if (!res.ok) {
      toast('Failed to export backup.', 'error');
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mashuka-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Full CMS & Store JSON backup downloaded.');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-[#111315] dark:text-white">
            Audit Logs &amp; One-Click Export Center
          </h1>
          <p className="text-xs text-[#525866] dark:text-[#9CA3AF]">
            Track administrative changes and export complete store backups for your hosting migration.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() =>
              downloadCsv(
                'mashuka-orders.csv',
                ['Order Number', 'Customer', 'Phone', 'City', 'Method', 'Total BDT', 'Status', 'Created'],
                data.orders.map((o) => [
                  o.order_number,
                  o.customer_name,
                  o.customer_phone,
                  o.city,
                  o.payment_method,
                  o.total,
                  o.status,
                  o.created_at,
                ])
              )
            }
            className="h-9 px-3 rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#14171F] text-xs font-medium inline-flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export Orders CSV</span>
          </button>
          <button
            type="button"
            onClick={() =>
              downloadCsv(
                'mashuka-products.csv',
                ['ID', 'Name', 'Category', 'Price BDT', 'Status', 'SKUs'],
                data.products.map((p) => [
                  p.id,
                  p.name,
                  p.category,
                  p.price,
                  p.status,
                  p.variants.map((v) => v.sku).join(' | '),
                ])
              )
            }
            className="h-9 px-3 rounded-lg border border-[#E4E6EB] dark:border-[#2C3344] bg-white dark:bg-[#14171F] text-xs font-medium inline-flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Catalog CSV</span>
          </button>
          <button
            type="button"
            onClick={downloadFullJson}
            className="h-9 px-4 rounded-lg bg-[#111315] dark:bg-[#2563EB] text-white text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <FileJson className="w-3.5 h-3.5" />
            <span>Full JSON Backup</span>
          </button>
        </div>
      </div>

      <DataTable
        rows={filteredLogs}
        getRowId={(l) => l.id}
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder="Filter audit events by actor, action, or target..."
        columns={[
          {
            key: 'time',
            header: 'Timestamp',
            sortValue: (l) => l.created_at,
            render: (l) => (
              <span className="font-mono text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">
                {formatDateTime(l.created_at)}
              </span>
            ),
          },
          {
            key: 'actor',
            header: 'Actor',
            sortValue: (l) => l.actor_name,
            render: (l) => (
              <div>
                <div className="font-semibold text-[#111315] dark:text-white">{l.actor_name}</div>
                <div className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">{l.actor_role}</div>
              </div>
            ),
          },
          {
            key: 'action',
            header: 'Action',
            render: (l) => <span className="font-mono font-semibold text-[#2563EB]">{l.action}</span>,
          },
          {
            key: 'target',
            header: 'Target & Details',
            render: (l) => (
              <div>
                <div className="font-medium text-[#111315] dark:text-white">{l.target}</div>
                <div className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">{l.details}</div>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
