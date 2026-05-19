from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.problem import Problem
from app.models.test_case import TestCase


class ProblemRepository:
    @staticmethod
    async def get_problem(db: AsyncSession, problem_id: int) -> Problem | None:
        result = await db.execute(
            select(Problem).where(Problem.id == problem_id, Problem.is_deleted == False)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def get_all_problems(db: AsyncSession) -> list[Problem]:
        result = await db.execute(
            select(Problem).where(Problem.is_deleted == False).order_by(Problem.id.asc())
        )
        return result.scalars().all()

    @staticmethod
    async def get_random_problem(db: AsyncSession) -> Problem | None:
        result = await db.execute(
            select(Problem)
            .where(Problem.is_deleted == False)
            .order_by(func.random())
            .limit(1)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def get_test_cases(db: AsyncSession, problem_id: int) -> list[TestCase]:
        result = await db.execute(
            select(TestCase)
            .where(TestCase.problem_id == problem_id)
            .order_by(TestCase.case_order.asc())
        )
        return result.scalars().all()

    @staticmethod
    async def create_problem(
        db: AsyncSession,
        title: str,
        description: str,
        input_desc: str,
        output_desc: str,
        difficulty: str,
        time_limit: int,
        memory_limit: int,
        sample_input: str | None = None,
        sample_output: str | None = None,
    ) -> Problem:
        problem = Problem(
            title=title,
            description=description,
            input_description=input_desc,
            output_description=output_desc,
            difficulty=difficulty,
            time_limit=time_limit,
            memory_limit=memory_limit,
            sample_input=sample_input,
            sample_output=sample_output,
        )
        db.add(problem)
        await db.commit()
        await db.refresh(problem)
        return problem

    @staticmethod
    async def add_test_case(
        db: AsyncSession,
        problem_id: int,
        input_data: str,
        expected_output: str,
        is_sample: bool = False,
        case_order: int = 1,
    ) -> TestCase:
        tc = TestCase(
            problem_id=problem_id,
            input_data=input_data,
            expected_output=expected_output,
            is_sample=is_sample,
            case_order=case_order,
        )
        db.add(tc)
        await db.commit()
        await db.refresh(tc)
        return tc

    @staticmethod
    async def delete_problem(db: AsyncSession, problem_id: int) -> None:
        from sqlalchemy import update
        await db.execute(
            update(Problem).where(Problem.id == problem_id).values(is_deleted=True)
        )
        await db.commit()
