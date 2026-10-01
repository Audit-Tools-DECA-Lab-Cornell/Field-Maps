import json
from hashlib import sha256
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from fieldmaps_api.domain.forms import AnswerError, validate_answers
from fieldmaps_api.errors import (
    ConflictError,
    NotFoundError,
    RoleRequiredError,
    ValidationFailedError,
)
from fieldmaps_api.repositories import collection
from fieldmaps_api.schemas import ObservationUpload, StoredObservation, UploadReceipt


async def upload_observation(
    session: AsyncSession,
    project_id: UUID,
    observation_id: UUID,
    user_id: UUID,
    payload: ObservationUpload,
) -> UploadReceipt:
    target = await collection.upload_target(session, project_id, payload)
    if target is None:
        message = "You cannot upload to this project, site, or form"
        raise RoleRequiredError(message)
    try:
        answers = validate_answers(target.definition, payload.answers)
    except AnswerError as error:
        raise ValidationFailedError(str(error), field="answers") from error
    upload = collection.ObservationWrite(
        observation_id=observation_id,
        project_id=project_id,
        user_id=user_id,
        target=target,
        payload=payload,
        answers_json=json.dumps(answers, sort_keys=True),
        fingerprint=sha256(payload.model_dump_json().encode()).hexdigest(),
    )
    await collection.insert_observation(session, upload)
    receipt = await collection.receipt(session, upload)
    if receipt is None:
        message = "This observation ID already exists with a different upload"
        raise ConflictError(message)
    return receipt


async def get_observation(
    session: AsyncSession, project_id: UUID, observation_id: UUID
) -> StoredObservation:
    observation = await collection.get_observation(session, project_id, observation_id)
    if observation is None:
        message = "Observation not found"
        raise NotFoundError(message)
    return observation
