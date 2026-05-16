from __future__ import annotations

from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.sql.expression import func

from app.models.problem import Problem
from app.models.test_case import TestCase


class ProblemRepository:
    @staticmethod
    async def create_problem(db: AsyncSession, **kwargs) -> Problem:
        problem = Problem(**kwargs)
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
        description: Optional[str] = None,
    ) -> TestCase:
        tc = TestCase(
            problem_id=problem_id,
            input_data=input_data,
            expected_output=expected_output,
            is_sample=is_sample,
            case_order=case_order,
            description=description,
        )
        db.add(tc)
        await db.commit()
        await db.refresh(tc)
        return tc

    @staticmethod
    async def get_all_problems(db: AsyncSession) -> list[Problem]:
        result = await db.execute(select(Problem).where(Problem.is_deleted == False))
        return list(result.scalars().all())

    @staticmethod
    async def get_problem(db: AsyncSession, problem_id: int) -> Problem | None:
        result = await db.execute(
            select(Problem).where(Problem.id == problem_id, Problem.is_deleted == False)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def get_test_cases(db: AsyncSession, problem_id: int) -> list[TestCase]:
        result = await db.execute(
            select(TestCase).where(TestCase.problem_id == problem_id).order_by(TestCase.case_order)
        )
        return list(result.scalars().all())

    @staticmethod
    async def get_random_problem(db: AsyncSession, difficulty: Optional[str] = None) -> Problem | None:
        query = select(Problem).where(Problem.is_deleted == False)
        if difficulty:
            query = query.where(Problem.difficulty == difficulty)
        result = await db.execute(query.order_by(func.random()))
        return result.scalar_one_or_none()

    @staticmethod
    async def update_problem(db: AsyncSession, problem_id: int, **kwargs) -> Problem | None:
        problem = await ProblemRepository.get_problem(db, problem_id)
        if problem:
            for k, v in kwargs.items():
                if v is not None:
                    setattr(problem, k, v)
            await db.commit()
            await db.refresh(problem)
        return problem

    @staticmethod
    async def delete_problem(db: AsyncSession, problem_id: int) -> bool:
        problem = await ProblemRepository.get_problem(db, problem_id)
        if problem:
            problem.is_deleted = True
            await db.commit()
            return True
        return False
