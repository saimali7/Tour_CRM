# Guide Portal Implementation

## Overview

The Guide Portal is a simplified interface for tour guides to manage their assignments. Guides access it via magic link authentication (no password required), making it easy for guides who may not be tech-savvy.

## Architecture

### Authentication Flow

1. Admin generates magic link for a guide
2. Link is sent to guide's email
3. Guide clicks link → validates token → creates session
4. Guide accesses portal with JWT-based session (7-day expiry)

### Route Structure

```
/guide
  /auth              - Magic link validation
  /                  - Dashboard (upcoming tours, pending assignments)
  /assignments       - All assignments with filtering
  /schedule/[id]     - Tour manifest with participant details
```

## Files Created

### Database Schema

**`/packages/database/src/schema/guide-tokens.ts`**
- Stores hashed magic link tokens
- Tracks token usage and expiration
- Security fields: IP address, user agent

**Key fields:**
- `token` - Hashed token (SHA-256)
- `expiresAt` - 7 day expiration
- `usedAt` - First use timestamp
- `lastAccessedAt` - Latest access

### Authentication Layer

**`/apps/crm/src/lib/guide-auth.ts`**

Core authentication functions:

```typescript
// Generate magic link
generateGuideMagicLink(guideId, organizationId, baseUrl): Promise<string>

// Validate token and create session
validateMagicLinkToken(rawToken): Promise<GuideContext | null>

// Get current session
getGuideContext(): Promise<GuideContext | null>

// Logout
guideLogout(): Promise<void>

// Cleanup (cron job)
cleanupExpiredTokens(): Promise<void>
```

**Security features:**
- Tokens are SHA-256 hashed in database
- JWT sessions with 7-day expiry
- HttpOnly cookies
- Secure flag in production

### tRPC API

**`/apps/crm/src/server/routers/guide-portal.ts`**

All endpoints use `guideProcedure` which validates guide session.

**Endpoints:**

1. `getMyDashboard` - Dashboard data
   - Upcoming tours (next 7 days)
   - Pending assignments
   - Statistics

2. `getMyAssignments` - All assignments with filtering
   - Filter by status: pending/confirmed/declined
   - Filter by date range
   - Includes schedule and booking details

3. `getAssignment` - Single assignment details

4. `confirmAssignment` - Accept an assignment
   - Validates assignment belongs to guide
   - Uses service layer for consistency

5. `declineAssignment` - Decline an assignment
   - Optional reason field
   - Records decline timestamp

6. `getScheduleManifest` - Tour participant manifest
   - Verifies guide is assigned to schedule
   - Returns all confirmed bookings
   - Calculates statistics (participants, revenue, etc.)

7. `getMyProfile` - Guide's profile information

### Portal Pages

#### 1. Layout (`/apps/crm/src/app/(guide-portal)/guide/layout.tsx`)

**Features:**
- Simple navigation (Dashboard, My Assignments)
- Organization branding
- Guide profile display
- Logout button
- Mobile responsive

#### 2. Auth Page (`/apps/crm/src/app/(guide-portal)/guide/auth/page.tsx`)

**States:**
- No token → Show "Magic link required" message
- Invalid/expired token → Error message
- Valid token → Redirect to dashboard

#### 3. Dashboard (`/apps/crm/src/app/(guide-portal)/guide/page.tsx`)

**Sections:**
- Stats cards (upcoming tours, pending assignments)
- Pending assignments with inline accept/decline
- Upcoming tours (next 7 days) with manifest links

**Actions:**
- Accept assignment (inline)
- Decline assignment (inline)
- View manifest (link to schedule page)

#### 4. Assignments (`/apps/crm/src/app/(guide-portal)/guide/assignments/page.tsx`)

**Features:**
- Tabbed filtering (All, Pending, Confirmed, Declined)
- Assignment cards with status badges
- Color-coded by status (amber=pending, green=confirmed, gray=declined)
- Accept/Decline buttons for pending
- View manifest for confirmed
- Shows decline reason for declined assignments

#### 5. Schedule Manifest (`/apps/crm/src/app/(guide-portal)/guide/schedule/[id]/page.tsx`)

**Displays:**
- Schedule details (date, time, meeting point)
- Statistics cards (bookings, participants, spots remaining, revenue)
- Full participant manifest table:
  - Booking reference
  - Customer name
  - Contact info (email, phone)
  - Participant count
  - Booking date
  - Amount paid

**Security:**
- Only shows manifest if guide is confirmed for the schedule

### Utilities

**`/apps/crm/src/lib/send-guide-magic-link.ts`**

Helper function to send magic links to guides. Currently logs the link for development. In production, integrate with email service (Resend).

Example usage:
```typescript
const magicLink = await sendGuideMagicLink(
  guide.id,
  organizationId,
  guide.email
);
```

## Integration Points

### For Admin Portal

Add a "Send Magic Link" button in the Guides management page:

```typescript
// In guides router or UI
const sendMagicLink = trpc.guide.sendMagicLink.useMutation();

<Button onClick={() => sendMagicLink.mutate({ guideId: guide.id })}>
  Send Portal Access Link
</Button>
```

Create the mutation:
```typescript
sendMagicLink: adminProcedure
  .input(z.object({ guideId: z.string() }))
  .mutation(async ({ ctx, input }) => {
    const guide = await db.query.guides.findFirst({
      where: and(
        eq(guides.id, input.guideId),
        eq(guides.organizationId, ctx.orgContext.organizationId)
      ),
    });

    if (!guide) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    return await sendGuideMagicLink(
      guide.id,
      ctx.orgContext.organizationId,
      guide.email
    );
  }),
```

### Email Integration (TODO)

Integrate with Resend in `send-guide-magic-link.ts`:

```typescript
import { Resend } from 'resend';
const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: 'noreply@yourcompany.com',
  to: guideEmail,
  subject: 'Your Guide Portal Access Link',
  html: GuidePortalEmail({ magicLink }), // Use React Email template
});
```

### Cron Job for Token Cleanup

Add to your job scheduler (Inngest, Vercel Cron, etc.):

```typescript
// Every day at 2 AM
await cleanupExpiredTokens();
```

## Security Considerations

1. **Token Storage**: Tokens are hashed (SHA-256) before storage
2. **Session Management**: JWT with 7-day expiry, HttpOnly cookies
3. **Authorization**: Every endpoint verifies guide owns the resource
4. **Data Isolation**: All queries filtered by organization
5. **HTTPS Only**: Secure flag enabled in production

## Testing Checklist

### Authentication
- [ ] Generate magic link for guide
- [ ] Click magic link → creates session
- [ ] Access dashboard without auth → redirects to auth page
- [ ] Invalid token → shows error
- [ ] Expired token → shows error
- [ ] Logout → clears session

### Dashboard
- [ ] Shows upcoming tours (next 7 days only)
- [ ] Shows pending assignments
- [ ] Accept assignment → moves to confirmed
- [ ] Decline assignment → moves to declined
- [ ] Stats update correctly

### Assignments
- [ ] Filter by status works
- [ ] Tabs show correct counts
- [ ] Accept/Decline updates immediately
- [ ] View manifest links to correct schedule

### Manifest
- [ ] Only accessible for confirmed assignments
- [ ] Shows all confirmed bookings
- [ ] Stats calculate correctly
- [ ] Contact info displayed
- [ ] Cannot access other guide's schedules

## Future Enhancements

1. **Push Notifications**: Notify guides of new assignments
2. **Schedule Changes**: Real-time updates for tour changes
3. **Communication**: In-app messaging with admin
4. **Check-in Feature**: Mark participants as present
5. **Notes**: Add guide notes to completed tours
6. **Ratings**: Customer feedback visible to guides
7. **Calendar Integration**: Export tours to Google Calendar
8. **Offline Mode**: PWA with offline manifest access

## Database Migration

Don't forget to run:

```bash
pnpm db:generate  # Generate migration
pnpm db:push      # Apply to database
```

## Environment Variables

Add to `.env`:

```env
# Guide Portal JWT Secret (change in production!)
GUIDE_JWT_SECRET=your-secure-secret-here-min-32-chars

# Base URL for magic links
NEXT_PUBLIC_APP_URL=https://app.yourcompany.com
```

## Routes Summary

| Route | Access | Purpose |
|-------|--------|---------|
| `/guide/auth` | Public | Magic link validation |
| `/guide` | Guide Auth | Dashboard |
| `/guide/assignments` | Guide Auth | All assignments |
| `/guide/schedule/[id]` | Guide Auth | Tour manifest |

## API Summary

| Endpoint | Input | Returns |
|----------|-------|---------|
| `guidePortal.getMyDashboard` | - | Upcoming tours + pending assignments |
| `guidePortal.getMyAssignments` | status?, dateRange? | Filtered assignments |
| `guidePortal.getAssignment` | id | Single assignment |
| `guidePortal.confirmAssignment` | id | Updated assignment |
| `guidePortal.declineAssignment` | id, reason? | Updated assignment |
| `guidePortal.getScheduleManifest` | scheduleId | Schedule + bookings + stats |
| `guidePortal.getMyProfile` | - | Guide profile |

## Notes

- The portal is read-only except for assignment confirmation/decline
- Guides cannot modify tours, schedules, or bookings
- All actions are logged via the existing activity log system
- Portal uses the same organization data as the main CRM
- No separate database or infrastructure required
