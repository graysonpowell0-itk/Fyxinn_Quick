-- Remove only the seven unchanged sample tickets inspected before release.
-- Preserve real reports and any sample ticket that has gained photos or repair work.
DELETE FROM issues
WHERE (id, location, description, reporter_name, reporter_phone, created_at, updated_at, status) IN (
VALUES
  ('FXQ-1042', '229', 'Mini refrigerator was not cooling; thermostat replaced.', 'Elena R.', '4045550118', '2026-09-08T13:05:00.000Z', '2026-09-08T13:05:00.000Z', 'completed'),
  ('FXQ-1043', 'North Lobby', 'Two ceiling lights near the elevators are flickering.', 'James K.', '4045550161', '2026-09-09T08:27:00.000Z', '2026-09-09T08:27:00.000Z', 'unaddressed'),
  ('FXQ-1044', '123', 'Bedside lamp outlet is not working.', 'James K.', '4045550161', '2026-09-08T16:21:00.000Z', '2026-09-08T16:21:00.000Z', 'completed'),
  ('FXQ-1045', '218', 'Shower is draining slowly after use.', 'Maria S.', '4045550146', '2026-09-09T09:42:00.000Z', '2026-09-09T09:42:00.000Z', 'in-progress'),
  ('FXQ-1046', '207', 'Desk chair arm is loose and needs to be tightened.', 'Ana P.', '4045550129', '2026-09-09T10:55:00.000Z', '2026-09-09T10:55:00.000Z', 'unaddressed'),
  ('FXQ-1047', '114', 'Air conditioner turns on but is not cooling the room.', 'Elena R.', '4045550118', '2026-09-09T11:38:00.000Z', '2026-09-09T11:38:00.000Z', 'in-progress'),
  ('FXQ-1048', '108', 'Bathroom faucet is leaking steadily at the base.', 'Maria S.', '4045550146', '2026-09-09T12:14:00.000Z', '2026-09-09T12:14:00.000Z', 'unaddressed')
)
AND latest_submission_id IS NULL
AND NOT EXISTS (SELECT 1 FROM issue_photos p WHERE p.issue_id = issues.id)
AND NOT EXISTS (SELECT 1 FROM repair_submissions s WHERE s.issue_id = issues.id)
AND NOT EXISTS (SELECT 1 FROM issue_updates u WHERE u.issue_id = issues.id AND u.id NOT IN ('35069cae-8203-4a2c-a3c2-6a7e748ffa0e', '65df8375-b632-4ae7-8f88-874c573c05d3', '85de2d57-11c7-488b-83f4-7cdb7d69c22e', '88149db5-2262-4e83-a205-7e81da7d55c6', '8dec97d0-9a22-43e5-86c9-0343629a143f', 'bba46487-0674-47be-8fef-cfc52b246d32', 'c6b2e0bf-2b66-4c77-a3b2-0cf349bb1bec'));
