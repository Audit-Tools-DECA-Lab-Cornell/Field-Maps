"""Run the authored mobile/server cases without generating expected answers."""

from dataclasses import asdict
from pathlib import Path
from typing import ClassVar

import pytest
from pydantic import BaseModel, ConfigDict, Field, JsonValue, TypeAdapter, ValidationError

from fieldmaps_api.domain.form_engine import prune_answers, visible_questions
from fieldmaps_api.domain.forms import (
    AnswerError,
    FormDefinition,
    StoredFormDefinition,
    normalize_answers,
    review_problems,
)
from fieldmaps_api.domain.legacy_forms import FormDefinition as LegacyFormDefinition

CONTRACTS = Path(__file__).resolve().parents[2] / "contracts" / "forms"


class Expected(BaseModel):
    visible: list[str]
    problems: list[dict[str, str]]
    answers: dict[str, JsonValue]
    dropped: list[str]
    options: dict[str, list[str]] = Field(default_factory=dict[str, list[str]])


class Step(BaseModel):
    answers: dict[str, JsonValue]
    expected: Expected


class Case(BaseModel):
    id: str
    definition: str | None = None
    steps: list[Step]


class CaseFile(BaseModel):
    model_config: ClassVar[ConfigDict] = ConfigDict(populate_by_name=True)
    form_version: str = Field(alias="formVersion")
    definitions: dict[str, FormDefinition] = Field(default_factory=dict[str, FormDefinition])
    cases: list[Case]


@pytest.mark.parametrize(
    "path",
    sorted((CONTRACTS / "cases").glob("*.cases.json")),
    ids=[path.name for path in sorted((CONTRACTS / "cases").glob("*.cases.json"))],
)
def test_shared_cases(path: Path) -> None:
    suite = CaseFile.model_validate_json(path.read_text())
    default = FormDefinition.model_validate_json(
        (CONTRACTS / f"{suite.form_version}.json").read_text()
    )
    for case in suite.cases:
        form = suite.definitions[case.definition] if case.definition else default
        for index, step in enumerate(case.steps):
            label = f"{case.id}, step {index}"
            visible = visible_questions(form, step.answers)
            problems = review_problems(form, step.answers)
            result = prune_answers(form, step.answers)
            assert [question.id for question in visible] == step.expected.visible, label
            assert [asdict(problem) for problem in problems] == step.expected.problems, label
            assert result.answers == step.expected.answers, label
            assert result.dropped == step.expected.dropped, label
            resolved = {question.id: question for question in visible}
            for question_id, options in step.expected.options.items():
                assert [option.code for option in resolved[question_id].options] == options, label
            if problems:
                with pytest.raises(AnswerError):
                    normalize_answers(form, step.answers)
            else:
                normalized = normalize_answers(form, step.answers)
                assert normalized.answers == step.expected.answers, label
                assert normalized.pruned == step.expected.dropped, label


def test_legacy_shell_adapter_keeps_codes_and_bounds() -> None:
    form = LegacyFormDefinition.model_validate(
        {
            "fields": [
                {
                    "code": "people",
                    "type": "integer",
                    "required": True,
                    "minimum": 0,
                    "maximum": 999,
                },
                {"code": "notes", "type": "text", "maxLength": 1000},
            ]
        }
    )
    answers: dict[str, JsonValue] = {"people": 4, "notes": "Practice"}
    assert normalize_answers(form, answers).answers == answers
    assert normalize_answers(form, answers).pruned == []
    invalid_answers: list[dict[str, JsonValue]] = [
        {"people": True},
        {"people": -1},
        {"people": 1000},
        {"unknown": 2},
    ]
    for invalid in invalid_answers:
        with pytest.raises(AnswerError):
            normalize_answers(form, invalid)


def test_bad_canonical_definition_cannot_fall_back_to_empty_legacy() -> None:
    with pytest.raises(ValidationError):
        TypeAdapter(StoredFormDefinition).validate_python({"questions": []})


@pytest.mark.parametrize(
    "change",
    [
        {"id": "people"},
        {"exportColumn": "people"},
        {"dependsOn": {"kind": "answered", "question": "missing"}},
        {"dependsOn": {"kind": "answered", "question": "notes"}},
        {"dependsOn": {"kind": "answered", "question": "observer"}},
        {"required": True, "optionsPending": "Pending"},
        {"kind": "one"},
        {"options": [{"code": "x", "label": "X"}]},
        {"hint": None},
        {"columns": True},
        {"required": "false"},
    ],
)
def test_definition_rejects_invalid_structure(change: dict[str, JsonValue]) -> None:
    form = FormDefinition.model_validate_json((CONTRACTS / "shell-v1.json").read_text())
    raw = form.model_dump(mode="json", by_alias=True, exclude_none=True)
    # Keep the input boundary typed, including deliberately invalid JSON fields.
    definition = TypeAdapter(dict[str, JsonValue]).validate_python(raw)
    questions = TypeAdapter(list[dict[str, JsonValue]]).validate_python(definition["questions"])
    questions[0].update(change)
    definition["questions"] = TypeAdapter(JsonValue).validate_python(questions)
    with pytest.raises(ValidationError):
        FormDefinition.model_validate(definition)


def test_input_defaults_unknown_properties_and_integer_json_numbers() -> None:
    suite = CaseFile.model_validate_json((CONTRACTS / "cases/janet-test-v1.cases.json").read_text())
    form = suite.definitions["rules"]
    question = form.questions[0]
    assert question.columns == 1
    assert question.required is False
    assert form.known_export_collisions == []
    assert form.protocol_notes == []
    assert "unknownFutureKey" not in form.model_dump()
    definition = TypeAdapter(dict[str, JsonValue]).validate_python(
        form.model_dump(mode="json", by_alias=True, exclude_none=True)
    )
    questions = TypeAdapter(list[dict[str, JsonValue]]).validate_python(definition["questions"])
    questions[0]["columns"] = 1.0
    definition["questions"] = TypeAdapter(JsonValue).validate_python(questions)
    assert FormDefinition.model_validate(definition).questions[0].columns == 1
    questions[0]["maxLength"] = 9007199254740992
    definition["questions"] = TypeAdapter(JsonValue).validate_python(questions)
    with pytest.raises(ValidationError):
        FormDefinition.model_validate(definition)


def test_canonical_definition_never_falls_back_to_legacy_fields() -> None:
    with pytest.raises(ValidationError):
        TypeAdapter(StoredFormDefinition).validate_python({"questions": [], "fields": []})
