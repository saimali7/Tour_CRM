# Tour Command Center

The center console for tour management and guide dispatch for the entire day — all guides in one view.

---

## Timeline

The timeline shows time on the X-axis (6 AM → 10 PM) and guides on the Y-axis. Each guide is a row.

A guide can on any given day have multiple bookings.

A guide has set capacity in their vehicle, but that means:

1. **Shared tours**: Guide might have a booking for Abu Dhabi in the morning that's shared, so multiple bookings at the same time slot combine together. If the guide's capacity is 8 and there are 3 bookings totaling 6 guests, they all stack into one visual block.

2. **Private/Charter tours**: The same guide can then have a booking in the evening for Dubai Safari which is private — you can't add multiple bookings to that time slot since it's private and the customer booked the entire vehicle.

---

## Hopper

The hopper is the left panel showing all unassigned bookings for the day.

A booking lands in the hopper when:
- It has no guide assigned yet
- It was unassigned from a guide

The hopper shows:
- Customer name
- Guest count (how many people)
- Tour name
- Pickup time
- Pickup zone (Marina, Downtown, Palm, etc.)

Bookings in the hopper are sorted by pickup time — urgent ones at the top.

---

## Edit Mode

By default, the timeline is read-only. You toggle Edit Mode to make changes.

In Edit Mode you can:

1. **Assign**: Drag a booking from the hopper onto a guide's row. The booking snaps to the correct time position based on its scheduled time.

2. **Reassign**: Drag a booking from one guide's row to another guide's row. This moves the booking to the new guide.

3. **Time Shift**: Drag a booking left or right within the same guide's row. This changes when the pickup happens. Use this when you need to adjust timing — maybe traffic is bad and you need the guide to leave earlier.

4. **Unassign**: Drag a booking from a guide's row back to the hopper. The booking becomes unassigned again.

---

## Capacity Rules

Each guide has a vehicle capacity (e.g., 8 seats).

When you drag a booking onto a guide:
- The system adds up all guests for that guide at that time slot
- If it exceeds capacity, you see a red warning
- The drop is still allowed (operator override) but the warning is clear

Example: Guide Sarah has 6 guests assigned for the 9 AM Desert Safari. You try to drag a 4-person booking to her. The system shows "10/8 — Over capacity!" in red.

---

## Charter Rules

A charter/private booking means the customer booked the entire vehicle for that time slot.

The same guide can have shared bookings in the morning and a private booking in the evening — or vice versa. The exclusivity only applies to that specific time slot.

Charter rules per time slot:
- If a time slot has a charter booking, you cannot add any other bookings to **that slot**
- If a time slot has shared bookings, you cannot add a charter booking to **that slot**
- Other time slots for the same guide are unaffected
- Charters are visually distinct (amber background, lock icon)

Example: Guide Ahmed has:
- 8 AM: Shared Desert Safari (3 bookings, 7 guests) ✓
- 2 PM: Private Abu Dhabi tour (1 booking, charter) ✓

You can add more bookings to his 8 AM slot (shared). You cannot add anything to his 2 PM slot (charter blocks it).

---

## Tour Grouping

Shared bookings for the same tour at the same time combine into one visual block called a "Tour Run."

A Tour Run shows:
- Tour name
- Total guest count across all bookings
- Number of bookings (e.g., "3 bookings")
- Pickup zones represented

Example: Three families all booked the 9 AM Desert Safari. They appear as one block showing "Desert Safari — 12 guests — 3 bookings" rather than three separate blocks.

You can click the Tour Run to see the individual bookings inside.

---

## Same Tour Requirement

When dropping a booking onto a guide who already has bookings at that time:
- The dragged booking must be for the same tour
- You can't mix different tours at the same time slot

Example: Guide Sarah has the 9 AM Desert Safari. You cannot drag a 9 AM City Tour booking onto her — the system blocks it with "Different tour — can't combine."

---

## Pickup Zones

Each booking has a pickup zone (Marina, Downtown, Palm Jumeirah, etc.).

Zones help with:
- Visual grouping (color-coded in the UI)
- Route planning (guides pick up from multiple zones in sequence)
- Filtering the hopper by zone

The timeline segments show the pickup zone color on the left border.

---

## Undo / Redo

Every action in Edit Mode can be undone.

- **Cmd+Z**: Undo last action
- **Cmd+Shift+Z**: Redo

The system keeps a history stack. You get a toast notification for each action showing what happened and offering an Undo button.

Example: You accidentally assign a booking to the wrong guide. Hit Cmd+Z, the booking returns to its previous location.

---

## Time Fields

Two time fields matter:

1. **bookingTime**: The tour slot time (e.g., "09:00" for the 9 AM tour). This determines where the booking appears on the timeline visually.

2. **pickupTime**: When the guide actually picks up the customer (e.g., "08:15" — 45 minutes before tour starts to account for drive time).

When you time-shift a booking, both fields update together.

---

## Guide Row States

A guide row can be:

1. **Empty**: No bookings assigned. Shows "No bookings assigned" in muted text.

2. **Has bookings**: Shows booking blocks positioned by time. Blocks are sized by tour duration.

3. **At capacity**: Guest count equals vehicle capacity. Shows in amber.

4. **Over capacity**: Guest count exceeds vehicle capacity. Shows in red with warning icon.

---

## What's Built

- Timeline view with guides as rows
- Hopper panel with unassigned bookings
- Edit Mode toggle
- Drag-and-drop: assign, reassign, time shift, unassign
- Capacity validation with warnings
- Charter validation (blocks invalid drops)
- Same-tour validation
- Undo/Redo with keyboard shortcuts
- Tour Run grouping for shared bookings

---

## What's Not Built Yet

- Auto-assignment algorithm (computer solves the puzzle overnight)
- Route optimization (minimize drive time)
- Map panel showing pickup locations
- Dispatch notifications (send manifests to guides via WhatsApp/email)
- Real-time guide location tracking
