"""Canonical input models; aliases preserve the mobile JSON contract."""

from __future__ import annotations

from typing import Annotated, ClassVar, Literal, Self

from pydantic import BaseModel, ConfigDict, Field, JsonValue, field_validator, model_validator
from pydantic.alias_generators import to_camel

NonEmpty = Annotated[str, Field(min_length=1)]


class ContractModel(BaseModel):
    model_config: ClassVar[ConfigDict] = ConfigDict(
        frozen=True, extra="ignore", strict=True, alias_generator=to_camel
    )


class Answered(ContractModel):
    kind: Literal["answered"]
    question: NonEmpty


class Comparison(ContractModel):
    kind: Literal["equals", "notEquals", "includes"]
    question: NonEmpty
    option: NonEmpty


class Junction(ContractModel):
    kind: Literal["all", "any"]
    of: Annotated[list[Condition], Field(min_length=1)]


type Condition = Answered | Comparison | Junction


class Option(ContractModel):
    code: NonEmpty
    label: NonEmpty


class OptionSet(ContractModel):
    code: NonEmpty
    export_column: str
    label: NonEmpty
    options: Annotated[list[Option], Field(min_length=1)]


class DynamicFrom(ContractModel):
    question: NonEmpty
    sets: dict[str, OptionSet]


class Question(ContractModel):
    id: NonEmpty
    code: NonEmpty
    export_column: str
    act: Literal["Child", "Social", "Play", "Setting", "Record"]
    label: NonEmpty
    hint: NonEmpty | None = None
    kind: Literal["one", "many", "text", "number"]
    options: list[Option] = Field(default_factory=list[Option])
    columns: Annotated[int, Field(ge=1, le=4)] = 1
    required: bool = False
    depends_on: Condition | None = None
    opened_by: NonEmpty | None = None
    dynamic_from: DynamicFrom | None = None
    placeholder: NonEmpty | None = None
    rows: Annotated[int, Field(ge=1, le=8)] | None = None
    max_length: Annotated[int, Field(ge=1, le=9007199254740991)] | None = None
    min: Annotated[int, Field(ge=-9007199254740991, le=9007199254740991)] | None = None
    max: Annotated[int, Field(ge=-9007199254740991, le=9007199254740991)] | None = None
    source: NonEmpty
    protocol_flag: NonEmpty | None = None
    options_pending: NonEmpty | None = None

    @field_validator("columns", "rows", "max_length", "min", "max", mode="before")
    @classmethod
    def integer_json_numbers(cls, value: JsonValue) -> JsonValue:
        # JSON has one number type: 1.0 must parse like 1, without coercing strings/bools.
        if isinstance(value, float) and value.is_integer():
            return int(value)
        return value

    @model_validator(mode="after")
    def reject_explicit_null(self) -> Self:
        for name in self.model_fields_set:
            if getattr(self, name) is None:
                message = f"{name} must be omitted rather than null"
                raise ValueError(message)
        return self


class ProtocolNote(ContractModel):
    id: NonEmpty
    title: NonEmpty
    detail: NonEmpty
    source: NonEmpty


class CanonicalDefinition(ContractModel):
    version: NonEmpty
    title: NonEmpty
    summary: NonEmpty
    source: NonEmpty
    status: Literal["draft", "published"]
    inclusion: NonEmpty
    known_export_collisions: list[str] = Field(default_factory=list[str])
    protocol_notes: list[ProtocolNote] = Field(default_factory=list[ProtocolNote])
    questions: Annotated[list[Question], Field(min_length=1)]
