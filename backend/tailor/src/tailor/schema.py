from typing import Any, NotRequired, TypedDict

from pydantic import BaseModel, ConfigDict, Field


class Organization(BaseModel):
    name: str = Field(..., description="The name of the hiring organization.")
    url: str | None = Field(None, description="The URL of the hiring organization.")
    logo: str | None = Field(
        None, description="A logo associated with the organization."
    )


class Place(BaseModel):
    addressLocality: str | None = Field(None, description="The locality/city.")
    addressRegion: str | None = Field(None, description="The region/state.")
    addressCountry: str | None = Field(None, description="The country.")


class JobLocation(BaseModel):
    address: Place | None = Field(None, description="The physical address of the job.")


class MonetaryAmount(BaseModel):
    currency: str | None = Field(None, description="The currency (e.g., USD).")
    value: float | None = Field(None, description="The value of the amount.")
    minValue: float | None = Field(None, description="The minimum value for a range.")
    maxValue: float | None = Field(None, description="The maximum value for a range.")
    unitText: str | None = Field(
        None, description="The unit of the amount (e.g., YEAR, HOUR)."
    )


class BaseSalary(BaseModel):
    value: MonetaryAmount = Field(
        ..., description="The monetary value of the base salary."
    )


class JobPosting(BaseModel):
    title: str = Field(..., description="The title of the job.")
    description: str = Field(..., description="The full job description.")
    hiringOrganization: Organization = Field(
        ..., description="The organization offering the job."
    )
    jobLocation: JobLocation | None = Field(
        None, description="The location(s) for the job."
    )
    jobLocationType: str | None = Field(
        None, description="E.g., TELECOMMUTE for remote jobs."
    )
    employmentType: list[str] | None = Field(
        None, description="Type of employment (e.g., FULL_TIME, CONTRACTOR)."
    )
    baseSalary: BaseSalary | None = Field(
        None, description="The base salary of the job."
    )
    datePosted: str | None = Field(None, description="The date the job was posted.")
    validThrough: str | None = Field(
        None, description="The date the job posting expires."
    )

    # Custom fields specifically extracted for tailoring relevance
    extracted_qualifications: list[str] = Field(
        default_factory=list,
        description="Extracted required qualifications and skills.",
    )
    extracted_responsibilities: list[str] = Field(
        default_factory=list, description="Extracted core responsibilities."
    )
    key_technologies: list[str] = Field(
        default_factory=list,
        description="Extracted key technologies, tools, or frameworks mentioned.",
    )

    model_config = ConfigDict(
        json_schema_extra={"@context": "https://schema.org/", "@type": "JobPosting"}
    )


class TailorState(TypedDict):
    job_description_input: str  # URL, file path, or raw text
    job_description_text: NotRequired[str | None]
    job_description_schema: NotRequired[dict[str, Any] | None]  # Parsed JobPosting
    base_resume: NotRequired[dict[str, Any] | None]
    draft_resume: NotRequired[dict[str, Any] | None]
    final_resume: NotRequired[dict[str, Any] | None]
    evaluation_score: NotRequired[int | None]
    output_dir: NotRequired[str | None]
