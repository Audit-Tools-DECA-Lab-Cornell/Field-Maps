from sqlalchemy.ext.asyncio import AsyncSession

from fieldmaps_api.identity_schemas import Identity, Profile, ProfilePatch
from fieldmaps_api.repositories import identity as repository


async def get_identity(session: AsyncSession) -> Identity:
    profile = await repository.ensure_profile(session)
    return Identity(
        profile=profile,
        organization_memberships=await repository.organization_memberships(session),
        project_memberships=await repository.project_memberships(session),
    )


async def patch_profile(session: AsyncSession, patch: ProfilePatch) -> Profile:
    profile = await repository.ensure_profile(session)
    if not patch.model_fields_set:
        return profile
    return await repository.update_profile(session, patch)
