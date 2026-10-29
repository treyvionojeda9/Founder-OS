import unittest
from api.app.main import (
    validate_proposed_task_core,
    enforce_vault_write_boundary,
)


class FounderOSBoundaryTests(unittest.TestCase):
    def test_validate_task_never_grants_execution(self):
        body = validate_proposed_task_core(
            source_note_id="HN-01JEXAMPLE42",
            project_id="PROJECT-LEARNING-LAB",
            description="Compare three onboarding workflows",
            requested_tool="create_internal_research_task",
        )
        self.assertTrue(body["valid_shape"])
        self.assertFalse(body["executable"])
        self.assertTrue(body["review_required"])
        self.assertEqual(body["task"]["source_note_id"], "HN-01JEXAMPLE42")

    def test_machine_principal_rejected_on_human_vault_write(self):
        with self.assertRaises(PermissionError) as ctx:
            enforce_vault_write_boundary(
                note_id="HN-01JEXAMPLE42",
                project_id="PROJECT-LEARNING-LAB",
                vault="human",
                content="Attempted machine overwrite of human note",
                revision=2,
                actor_role="machine",
            )
        self.assertIn("AUDIT_REJECT", str(ctx.exception))

    def test_human_principal_permitted_on_human_vault_write(self):
        res = enforce_vault_write_boundary(
            note_id="HN-01JEXAMPLE42",
            project_id="PROJECT-LEARNING-LAB",
            vault="human",
            content="Original human handwritten thought",
            revision=1,
            actor_role="human",
        )
        self.assertTrue(res["saved"])
        self.assertEqual(res["vault"], "human")
        self.assertEqual(res["actor_role"], "human")

    def test_machine_principal_permitted_on_machine_vault_write(self):
        res = enforce_vault_write_boundary(
            note_id="MN-01JREPORT99",
            project_id="PROJECT-LEARNING-LAB",
            vault="machine",
            content="Cited research report with provenance",
            revision=1,
            actor_role="machine",
        )
        self.assertTrue(res["saved"])
        self.assertEqual(res["vault"], "machine")


if __name__ == "__main__":
    unittest.main()
