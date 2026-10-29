from dataclasses import dataclass, asdict
from typing import Literal

try:
    from fastapi import FastAPI, Header, HTTPException
    from pydantic import BaseModel, Field
    FASTAPI_AVAILABLE = True
except ImportError:
    FASTAPI_AVAILABLE = False


@dataclass
class ProposedTaskRecord:
    source_note_id: str
    project_id: str
    description: str
    requested_tool: str


def validate_proposed_task_core(
    source_note_id: str,
    project_id: str,
    description: str,
    requested_tool: str,
) -> dict:
    if len(description.strip()) < 5:
        raise ValueError("description must be at least 5 characters")
    record = ProposedTaskRecord(
        source_note_id=source_note_id,
        project_id=project_id,
        description=description,
        requested_tool=requested_tool,
    )
    return {
        "valid_shape": True,
        "executable": False,
        "review_required": True,
        "task": asdict(record),
    }


def enforce_vault_write_boundary(
    note_id: str,
    project_id: str,
    vault: Literal["human", "machine"],
    content: str,
    revision: int,
    actor_role: str = "machine",
) -> dict:
    """Enforces the Chapter 3 & Chapter 12 one-way Human/Machine Vault boundary."""
    if vault == "human" and actor_role != "human":
        raise PermissionError(
            "AUDIT_REJECT: Machine or agent principal cannot create or modify Human Vault records."
        )
    return {
        "saved": True,
        "id": note_id,
        "project_id": project_id,
        "vault": vault,
        "actor_role": actor_role,
        "revision": revision,
    }


if FASTAPI_AVAILABLE:
    app = FastAPI(title="Founder OS - training scaffold")

    class ProposedTask(BaseModel):
        source_note_id: str
        project_id: str
        description: str = Field(min_length=5)
        requested_tool: str

    class NoteWriteRequest(BaseModel):
        id: str
        project_id: str
        vault: Literal["human", "machine"]
        content: str
        revision: int = Field(ge=1)

    @app.get("/health")
    def health():
        return {"status": "ok", "mode": "development"}

    @app.post("/tasks/validate")
    def validate_task(task: ProposedTask):
        return validate_proposed_task_core(
            source_note_id=task.source_note_id,
            project_id=task.project_id,
            description=task.description,
            requested_tool=task.requested_tool,
        )

    @app.post("/notes/write")
    def write_note(
        payload: NoteWriteRequest,
        x_actor_role: str = Header(default="machine"),
    ):
        try:
            return enforce_vault_write_boundary(
                note_id=payload.id,
                project_id=payload.project_id,
                vault=payload.vault,
                content=payload.content,
                revision=payload.revision,
                actor_role=x_actor_role,
            )
        except PermissionError as exc:
            raise HTTPException(status_code=403, detail=str(exc))
