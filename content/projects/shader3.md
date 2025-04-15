## GPU Instanced BOIDs

A wildlife simulation made in Unity that leverages compute shaders to mimic the behavior of schooling fish in real time. This project was initally an experiment to demonstrate the superior throughput of GPU computation over multi-threading via the Data-oriented technology stack (DOTS) for pure math workloads, However it also served as a learning experience and an introduction to Computer Shaders and BOIDs


## Code Example
This compute shader kernel is responsible for updating each individual boid’s position and velocity based on classic flocking behaviors: alignment, cohesion, and separation. It leverages GPU parallelism to handle thousands of agents in real time.

```
[numthreads(256, 1, 1)]
void CSMain(uint3 id : SV_DispatchThreadID)
{
    if (id.x >= _NumBoids) return;

    Boid boid = Boids[id.x];
    float3 position = boid.position;
    float3 velocity = boid.velocity;

    float3 alignment = float3(0, 0, 0);
    float3 cohesion = float3(0, 0, 0);
    float3 separation = float3(0, 0, 0);
    int neighborCount = 0;

    for (uint i = 0; i < _NumBoids; i++)
    {
        if (i == id.x) continue;

        Boid other = Boids[i];
        float3 offset = other.position - position;
        float dist = length(offset);

        if (dist < _PerceptionRadius)
        {
            alignment += other.velocity;
            cohesion += other.position;
            separation -= offset / (dist + 0.01);
            neighborCount++;
        }
    }

    if (neighborCount > 0)
    {
        alignment = normalize(alignment / neighborCount) * _Speed;
        cohesion = normalize((cohesion / neighborCount - position)) * _Speed;
        separation = normalize(separation / neighborCount) * _Speed;

        float3 acceleration = (alignment * _AlignWeight + cohesion * _CohesionWeight + separation * _SeparationWeight);
        velocity = normalize(velocity + acceleration) * _Speed;
    }

    position += velocity * _DeltaTime;

    boid.position = position;
    boid.velocity = velocity;
    Boids[id.x] = boid;
}
```